'use strict'

const {Transaction, 
        TransactionDetail, 
        CuponSerie,
        CuponCond,
        Cupon
        } = require('loyalty-db')

const numeroCupon = (retorno) =>{
  let caracteres = 6
  let digitos = '0123456789abcdefghijklmnopqrstuvwxyz'
  let randomString = ''
  while(caracteres > 0) {
    randomString += digitos.charAt(Math.floor(Math.random() * digitos.length));
    caracteres--;
  }
  if(retorno === 'punto_fijo'){
    randomString = '$' + randomString
  }
  return randomString
}

module.exports = {
  async validaCupon(codigo, id_comercio, cuenta) {
    console.log('Validamos si el cupón es valido')
    try{
      let dataCuponSerie = {
        codigo: codigo,
        id_comercio: id_comercio,

      }
      let detalle_cupon = await CuponSerie.searchCuponSerieCupon(dataCuponSerie)
      if(detalle_cupon.length === 0) {
        // si no existe mandamos error
        let returnObject = {
          cuponValido: false,
          message: 'El cupón es inválido'
        }
        return returnObject
      }else{
        // validamos que se encuentre vigente
        if(detalle_cupon[0].vigencia !== 'Sin vigencia'){
          let vigenciaCupon = new Date(detalle_cupon[0].vigencia)
          let hoy = new Date()
          if(vigenciaCupon < hoy){
            let returnObject = {
              cuponValido: false,
              message: 'El cupón se encuentra vencido'
            }   
            return returnObject
          }
        }
      }
      // VALIDA QUE EL CUPÓN NO HAYA SIDO UTILIZADO CUANDO EL CUPÓN NO ES GENERICO:
      if(detalle_cupon[0].generico !== 1){
        // vemos si el cupon no se ha usado:
        let dataCuponUsado = {
          id_cupon_serie: detalle_cupon[0].id_cupon_serie
        }
        let cupon_usado = await TransactionDetail.searchTransactionDetail(dataCuponUsado)
        if(cupon_usado.length > 0){
          let returnObject = {
              cuponValido: false,
              message: 'El cupón ya fue usado'
          }
          return returnObject
        }
      }
      // VALIDA CUPÓN GENERICO Y UNICO POR CUENTA:
      if(detalle_cupon[0].generico === 1 && detalle_cupon[0].unico_cuenta === 1){
        let dataCuponUsado = {
          id_cupon_serie: detalle_cupon[0].id_cupon_serie,
          cuenta: cuenta
        }
        let cupon_usado = await Transaction.searchTransactionComplete(dataCuponUsado)
        if(cupon_usado.length > 0){
          return returnObject = {
            cuponValido: false,
            message: 'El cupón ya fue usado'
          }
        }
      }
      // CHECAMOS LAS CONDICIONES DEL CUPON:
      let dataCuponCond = {
        id_cupon: detalle_cupon[0].id_cupon
      }
      let condicionesCupon = await CuponCond.searchCuponCond(dataCuponCond)
      if(condicionesCupon.length === 0){
        let returnObject = {
          cuponValido: true,
          infoCupon: detalle_cupon[0],
          message: 'Cupón válido'
        }
        return returnObject
      }else{
        let hoy = new Date()
        let diaSemana = hoy.getDay() + 1
        let diaMes = hoy.getDay()
        // let mesHoy = hoy.getMonth()
        let tiempo = hoy.getTime()
        let validacionCondiciones = true
        for(let item of condicionesCupon){
          if(item.var === 'dias-semana'){
            for(dias of item.val1.split(',')){
              if(dias === diaSemana) validacionCondiciones = false
            }
          }
          if(item.var === 'dias-mes'){
            for(dias of item.val1.split(',')){
              if(dias === diaMes) validacionCondiciones = false 
            }
          }
          if(item.var === 'rango-dias'){
            if(diaMes < item.val1 || diaMes > item.val2) validacionCondiciones = false
          }
          if(item.var === 'rango-fechas'){
            let fecha1 = new Date(item.val1)
            let fecha2 = new Date(item.val2)
            if(hoy < fecha1 || hoy > fecha2) validacionCondiciones = false
          }
          if(item.var === 'horas'){
            let hoyString = toString(hoy)
            let horas = item.val1.split(',')
            let fecha1 = new Date(`${hoyString} ${horas[0]}`)
            let fecha2 = new Date(`${hoyString} ${horas[1]}`)

            if(tiempo < fecha1.getTime() || tiempo > fecha2.getTime()) validacionCondiciones = false
          }
        }
        if(validacionCondiciones === true){
          let returnObject = {
            cuponValido: true,
            infoCupon: detalle_cupon[0],
            message: 'Cupón válido'
          }
          return returnObject
        }else{
          let returnObject = {
            cuponValido: false,
            message: 'El cupón no puede ser utilizado'
          }
          return returnObject
        }
      }
    }catch(err){
      return err
    }
    
  },
  async asignaCupon(id_cupon, id_comercio){
    // Primero vemos si existe el cupon:
    let cuponInfo = await Cupon.searchById(id_cupon, id_comercio)
    if(cuponInfo > 0){
      if(cuponInfo[0].vig === 1){
        if(cuponInfo[0].upload_file === 1){
          // buscamos un numero de serie existente para asignarlo
          let dataCuponSerie = {
            assigned: 0,
            id_cupon: id_cupon
          }
          let cuponSerie = await CuponSerie.searchCuponSerie(dataCuponSerie)
          if(cuponSerie.length > 0){
            // Actualizamos el primer registro y lo retornamos: updateCuponSerie
            let dataActCuponSerie = {
              assigned: 1,
              id_cupon_serie: cuponSerie[0].id_cupon_serie
            }
            let actualizaCuponSerie = await CuponSerie.updateCuponSerie(dataActCuponSerie)
            let returnObject = {
              error: false,
              cupon_serie: cuponSerie[0].id_cupon_serie,
              codigo: cuponSerie[0].codigo,
              cupon: cuponInfo[0]
            }
            return returnObject
          }else{
            // Creamos la nueva serie
            let validacionCupon = true
            let nuevoCupon = ''
            while(validacionCupon){
              nuevoCupon = numeroCupon(cuponInfo[0].tipo_retorno)
              let validaCodigoCupon = await CuponSerie.searchCuponSerie({codigo: nuevoCupon})
              if(validaCodigoCupon.length === 0) validacionCupon = false
            }
            // insertamos el nuevo cupon:
            let dataAgregaCuponSerie = {
              id_cupon: id_cupon,
              codigo: nuevoCupon,
              assigned: 1
            }

            let creaCuponSerie = await CuponSerie.createCuponSerie(dataAgregaCuponSerie)

            let returnObject = {
              error: false,
              cupon_serie: creaCuponSerie.insertId,
              codigo: nuevoCupon,
              cupon: cuponInfo[0]
            }
            return returnObject
          }
        }else{
          // Generamos una nueva serie para el cupon
          let validacionCupon = true
          let nuevoCupon = ''
          while(validacionCupon){
            nuevoCupon = numeroCupon(cuponInfo[0].tipo_retorno)
            let validaCodigoCupon = await CuponSerie.searchCuponSerie({codigo: nuevoCupon})
            if(validaCodigoCupon.length === 0) validacionCupon = false
          }
          // insertamos el nuevo cupon:
          let dataAgregaCuponSerie = {
            id_cupon: id_cupon,
            codigo: nuevoCupon,
            assigned: 1
          }

          let creaCuponSerie = await CuponSerie.createCuponSerie(dataAgregaCuponSerie)

          let returnObject = {
            error: false,
            cupon_serie: creaCuponSerie.insertId,
            codigo: nuevoCupon,
            cupon: infoCupon[0]
          }
          return returnObject
        }
      }else{
        let returnObject = {
          error: true,
          message: 'El cupon ya no está vigente'
        }
        return returnObject
      }
    }else{
      let returnObject = {
        error: true,
        message: 'El cupon no existe'
      }
      return returnObject
    }

  }
}