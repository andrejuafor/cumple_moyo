'use strict'

const {
        Transaction, 
        TransactionDetail,
        Benefit, 
        AccountReference, 
        BenefitAccount,
        PrizeAccount, 
        Category,
        ReferenceAccount,
        Office } = require('loyalty-db')
const {validaCuenta} = require('./account')
const {validaCupon} = require('./cupon')
var arregloCuentas = []

async function referenciasFunc(cuentas, id_comercio, nivel = 0){
  try{
    let contador = 1
    let busqueda = 1
    let cuentas_referenciadas = []
    if(contador <= (nivel-1) || nivel === 0 ){
      for(let item of cuentas){
        contador++
        let where = ''
        let i = 0
        for(let item1 of arregloCuentas){
          if(i === 0){
            where += `'${item1}'`
          }else{
            where += `, '${item1}'`
          }
          i++
        }
        let accountValido = await ReferenceAccount.accountValidate(where, item.cuenta, id_comercio)
        if(accountValido.length > 0){
          for(let item2 of accountValido){
            if(arregloCuentas.indexOf(item2.cuenta) === -1){
              arregloCuentas.push(item2.cuenta)
            }
          }
          cuentas_referenciadas.push(item.cuenta)
          await referenciasFunc(accountValido,id_comercio, nivel)
        }else{
          cuentas_referenciadas.push(item.cuenta)
        }
      }
    }
    return arregloCuentas
  }catch(err){
    return err
  }
}

module.exports = {
  async checkBeneficio(comercio, cuenta, monto) {
    console.log('Revisando beneficios')
    try{
      //Obtenemos los beneficios del comercio
      let beneficioComercio = await Benefit.benefitsMerchant(comercio, cuenta, monto)
      let listaBeneficios = []
      if(beneficioComercio.length > 0){
        let contador = 0
        for(let item of beneficioComercio){
          if(item.fecha_desde_valido === 1 && item.fecha_hasta_valido === 1){
            let beneficioDirectoCuenta = await BenefitAccount.benefitAccountDirectly(item.id_beneficio, cuenta)
            if(beneficioDirectoCuenta.length > 0 || item.tiene_beneficio === 1){
              listaBeneficios.push(item)
            }
          }else{
            let returnObject = {
              error: true,
              message: "Sin beneficios"
            }
            return returnObject    
          }
          contador ++
        }
        if(listaBeneficios.length === 0){
          let returnObject = {
            error: true,
            message: "Sin beneficios"
          }
          return returnObject
        }else{
          let i = {
            principal: 3,
            no_acumulable: 2,
            acumulable: 1
          }
          let ben = []
          for(let item of listaBeneficios){
            if(ben.length === 0){
              ben = item
            }
            if(i[item.caracts] > i[ben.caracts]){
              ben = item
            }else if(i[item.caracts] === i[ben.caracts]){
              if(i[item.caracts] > 1){
                if(item.porcentaje > ben.porcentaje){
                  ben = item
                }
              }else{
                ben.porcentaje += item.porcentaje
              }
            }
          }
          let returnObject = {
            error: false,
            beneficio: ben
          }
          return returnObject
        }
      }else{
        let returnObject = {
          error: true,
          message: "Sin beneficios"
        }
        return returnObject
      }
    }catch(err){
      return err
    }
  },
  async referencias(cuentas, id_comercio, nivel = 0){
    console.log('Entramos a Referencias:')
    try{
      let contador = 1
      let cuentas_referenciadas = []
      if((contador <= (nivel-1)) || (nivel === 0)){
        for(let item of cuentas){
          contador++
          let where = ''
          let i = 0
          for(let item1 of arregloCuentas){
            if(i === 0){
              where += `'${item1}'`
            }else{
              where += `, '${item1}'`
            }
            i++
          }
          let accountValido = await ReferenceAccount.accountValidate(where, item.cuenta, id_comercio)
          if(accountValido.length > 0){
            for(let item2 of accountValido){
              if(arregloCuentas.indexOf(item2.cuenta) === -1){
                arregloCuentas.push(item2.cuenta)
              }
            }
            cuentas_referenciadas.push(item.cuenta)
            await referenciasFunc(accountValido,id_comercio, nivel)
          }else{
            cuentas_referenciadas.push(item.cuenta)
          }
        }
      }
      return arregloCuentas
    }catch(err){
      return err
    }
  },
  async creaTransaccionRef(id_transaccion, cuenta, id_comercio, id_sucursal, id_usuario, notifica_transaccion){
    // revisamo la cuenta referenciable:
    //Buscamos los datos de la transaccion:
    let transaccionDetalleInfo = await TransactionDetail.searchTransactionDetailReference(id_transaccion)
    
    let total_transaccion = transaccionDetalleInfo[0].total
    let vigencia_transaccion = transaccionDetalleInfo[0].vigencia

    let infoCuentaReferencia = await AccountReference.searchAccountReference({id_comercio: id_comercio, cuenta: cuenta})
    if(infoCuentaReferencia.length > 0){
      let puntosReferencia = total_transaccion * infoCuentaReferencia[0].retorno
      if(infoCuentaReferencia[0].beneficio_compra === 1){
        // buscamos el rango que se le va dar:
        let rango = AccountReference.searchReferenceRange({id_cuenta_ref: infoCuentaReferencia[0].id_cuenta_ref, monto: total_transaccion})
        if(rango.length === 0){
          return false
        }
        puntosReferencia = rango[0].puntos
      }
      // Creamos la transacción:
      let dataTransaction = {
        id_usuario: id_usuario,
        id_sucursal: id_sucursal,
        cuenta: cuenta,
        puntos: Math.round(Number(puntosReferencia)),
        referencia: `Ref: ${id_transaccion}`,
        id_transaccion_ref: id_transaccion,
        concepto: "Referenciado",
        total: 0,
      }
      let altaTransaccionReferenciable = await Transaction.createTransaction(dataTransaction)
      let dataTransaccionDetalle = {
        id_transaccion: altaTransaccionReferenciable.insertId,
        id_punto: null,
        referencia: `Ref: ${id_transaccion}`,
        concepto: "Referenciado",
        puntos: Math.round(Number(puntosReferencia)),
        porcentaje: 1,
        vigencia: (vigencia_transaccion === '') ? null : vigencia_transaccion,
        total: 0,
        id_cupon_serie: null
      }
      let altaTransaccionDetReferenciable = await TransactionDetail.createTransactionDetail(dataTransaccionDetalle)
      if(notifica_transaccion === '1'){
        // Enviamos mail de notificación.
        // ############################################

        // ############################################
      }
      
      return true
    }else{
      return false
    }
  },
  async beneficioMonto(comercio, cuenta, beneficio, total){
    try{
      //Primero vemos si no obtuvo ya este beneficio:
      let premiosAplicados = await PrizeAccount.searchPrizeAccountMax({cuenta:cuenta, id_beneficio_registro:beneficio})
      let maximoCompra = await Transaction.searchTransactionByAmmount(cuenta, comercio, premiosAplicados.fecha)
      if(Number(maximoCompra) >= total){
        return true
      }else{
        return false
      }
    }catch(err){
      return err
    }
  },
  async numeroDeCompra(comercio, cuenta){
    //obtenemos el numero de compra que está realizando el cliente: 
  },
  async validaLineaBach(data, id_sucursal, id_comercio, requiere_clave){
    try{
      let sucursalActual = (data[7] !== undefined && data[7] !== '') ? data[7] : id_sucursal
      let returnObject = {
        error: false,
        sucursalActual: sucursalActual
      }
      // Vemos si la sucursal enviada es del comercio:
      if(data[7] !== undefined && data[7] !== ''){
        let infoSucursal = await Office.searchOffice({id_sucursal: sucursalActual, id_comercio: id_comercio})
        if(infoSucursal.length === 0){
          returnObject.error = true
          returnObject.message = 'La sucursal enviada no pertenece al comercio'
          return returnObject
        }else{
          returnObject.nomSucursal = infoSucursal[0].nombre
        }
      }
      
      if(data.length < 6){
        returnObject.error = true
        returnObject.message = 'El registro no cuenta con el numero de campos requeridos'
        return returnObject
      }
      // se valida cuenta, referencia, categoria y total mayor a cero 
      if(data[0] === '' || data[3] === '' || data[5] === '' || (data[6] ==='' || data[6] <= 0) ){
        if(data[0] === ''){
          returnObject.message = 'Falta el numero de cuenta'
        }
        if(data[3] === ''){
          returnObject.message = 'Faltala referencia'
        }
        if(data[5] === ''){
          returnObject.message = 'Falta el concepto de la transacción'
        }
        if(data[6] <= 0 || data[6] === ''){
          returnObject.message = 'El total debe ser mayor a cero'
        }
        returnObject.error = true
        return returnObject
      }else{
        if(data[7] !== undefined){
          returnObject.sucursalActual = data[7]
          sucursalActual = data[7]
        }
        // vemos si la cuenta es válida:
        let cuentaValida = await validaCuenta(data[0], data[1], id_comercio, requiere_clave) 
        if(cuentaValida.error === false){
          // let pocosDatos = await Merchant.littleData(req.dataLR.id_comercio)
          // /**
          //  * Si esta opción esta activa tus cuentas no podran pagar con puntos si no han registrado todos sus datos
          //  *  (sexo, telefono, email, fecha de nacimiento, codigó postal)
          //  */
          // let fecha_nacimiento_valida = split('-', cuentaValida.result[0].fecha_nacimiento)
          // if( (pocosDatos[0].registro_completo_cuenta === 1) && (cuentaValida.result[0].sexo !== '' || cuentaValida.result[0].cel !== '' || cuentaValida.result[0].email !== '' || fecha_nacimiento_valida[0] !== '' || fecha_nacimiento_valida[1] !== '' || fecha_nacimiento_valida[2] !== '' || cuentaValida.result[0].codigo_postal !== '')){
          //   if(cuentaValida.result[0].sexo !== 'w'){
          //     // si no es cupon rechazamos la petición.
          //     next({message:'La cuenta debe tener datos completos para poder hacer un pago con puntos.', stack:'Paid/Coupon'})
          //   }
          // }
          
          // vemos si la categoría es válida:
          let categoriaValida = await Category.activeCategory({active: true, id_categoria: data[5], id_sucrusal: sucursalActual, id_comercio: id_comercio})
          console.log('Aqui 3')
          if(categoriaValida.length > 0){
            // validamos que el cupon sea valido:
            if(data[4] !== ''){
              let infoCupon = await validaCupon(data[4], id_comercio, cuentaValida.result[0].cuenta)
              if(infoCupon.error === true){
                returnObject.error = true
                returnObject.message = 'El cupón no existe'
                return returnObject
              }else{
                //retornamos la información con el cupon:
                returnObject.infoCategoria = categoriaValida[0]
                returnObject.infoCuenta = cuentaValida
                returnObject.infoCupon = infoCupon.infoCupon
                return returnObject
              }
            }else{
              returnObject.infoCategoria = categoriaValida[0]
              returnObject.infoCuenta = cuentaValida.result[0]
              return returnObject
            }
          }else{
            returnObject.error = true
            returnObject.message = "Categoría inválida"
            return returnObject
          }
        }else{
          returnObject.error = true
          returnObject.message = cuentaValida.message
          return returnObject
        }
      }
    }catch(err){
      return err
    }
  }
}