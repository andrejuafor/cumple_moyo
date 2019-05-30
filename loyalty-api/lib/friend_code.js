'use strict'

const {BenefitRegistry, Transaction, TransactionDetail, AccountCupon, Account} = require('loyalty-db')
const {validaCuentaComercio, actualizaSaldoCompleto} = require('./account')
const {asignaCupon} = require('./cupon')

module.exports = {
  async registraCodigoAmigo(tipo_codigo, id_comercio, nom_comercio, cuenta_amigo, cuenta_recomienda, corporativo, redondea_puntos, puntos_x_peso, notifica_transaccion){
    // validamos si existe un beneficio de codigo amigo:
    try{
      // vemos si tiene Beneficio de recomendación:
      let dataBeneficioRecomendacion = {
        tipo_codigo_amigo: tipo_codigo,
        id_comercio: id_comercio,
        type: 'codigo_amigo'
      }
      let beneficioRecomendacion = await BenefitRegistry.searchBenefitTransaction(dataBeneficioRecomendacion)
      if(beneficioRecomendacion.length > 0){
        console.log('Si tenemos beneficio de codigo amigo para registro')
        // vemos si la cuenta de amigo existe en el comercio:
        let validaCuentaAmigoComercio = await validaCuentaComercio(cuenta_amigo, id_comercio)
        if(validaCuentaAmigoComercio.error === false){
          // vemos si la cuenta ya dio el beneficio a otro amigo:
          let dataNumTransacciones = {
            cuenta_amigo: cuenta_amigo,
            cuenta: cuenta_recomienda,
            id_comercio: id_comercio
          }
          let numTransaccionesAmigo = await Transaction.numTransactionAccount(dataNumTransacciones)
          if(numTransaccionesAmigo.length === 0){
            console.log('La cuenta no ha dado beneficio a otro amigo')
            // registramos la transaccion
            let dataTransaccion = {
              id_usuario: null,
              id_sucursal: corporativo,
              cuenta: cuenta_amigo,
              puntos: redondea_puntos === 1 ? Math.round(beneficioRecomendacion[0].puntos) : beneficioRecomendacion[0].puntos,
              referencia: beneficioRecomendacion[0].nombre,
              concepto: 'Beneficio por recomendacion',
              total: 0,
              cuenta_amigo: cuenta_recomienda
            }
            let altaTransaccion = await Transaction.createTransaction(dataTransaccion)
            // registramos el detalle de la transaccion:
            let dataTransaccionDetalle = {
              id_transaccion: altaTransaccion.insertId,
              id_punto: null,
              concepto: 'Beneficio por recomendación',
              referencia: beneficioRecomendacion[0].nombre + ' ; Puntos fijos',
              puntos: redondea_puntos === 1 ? Math.round(beneficioRecomendacion[0].puntos) : beneficioRecomendacion[0].puntos,
              porcentaje: 1,
              vigencia: beneficioRecomendacion[0].vigencia,
              total: 0,
              id_cupon_serie: null
            }
            await TransactionDetail.createTransactionDetail(dataTransaccionDetalle)
            // Ahora vemos si el beneficio tiene un cupon:
            let cupones = []
            if(beneficioRecomendacion[0].id_cupon !== ''){
              // Buscamos el cupon: 
              let infoCupon = asignaCupon(beneficioRecomendacion[0].id_cupon, id_comercio)
              if(infoCupon.error === false){
                // asignamos el cupon al usuario:
                let dataAltaCuentaCupon = {
                  serie_id: infoCupon.cupon_serie,
                  cuenta_id: id_sucursal_cuenta, 
                }
                let altaCuponSerie = await AccountCupon.createAccountCupon(dataAltaCuentaCupon)
                let cuponAsignado = {
                  nombre: infoCupon.cupon.nombre,
                  comercio: nom_comercio,
                  puntos: infoCupon.cupon.valor_retorno,
                  codigo: infoCupon.codigo,
                  tipo: infoCupon.cupon.nom_retorno,
                  concepto: infoCupon.cupon.concepto
                }
                cupones.push(cuponAsignado)
                cuponMailing = [{codigo:infoCupon.codigo, vigencia: infoCupon.vig, nombre: infoCupon.cupon.nombre}]
              }
            }
            // ########################################
            // vemos si el comercio notifica transacciones:
            if(notifica_transaccion === 1){
              conceptosMailing = [{
                                    tipo:'beneficio', nombre: beneficioRecomendacion[0].nombre, 
                                    puntos: redondea_puntos === 1 ? Math.round(beneficioRecomendacion[0].puntos) : beneficioRecomendacion[0].puntos, 
                                    vigencia: montoCompra[0].vigencia
                                  }]
              console.log('notificamos la transaccion')
              // Obtenemos los datos de la cuenta recomendada
              let infoCuentaRec = await Account.searchAccount({cuenta: cuenta_amigo})
              // obtenemos el saldo de la cuenta: 
              let saldoFinal = await actualizaSaldoCompleto(cuenta_amigo, id_comercio)
              // armamos la data para el contenido del mail:
              let dataMail = {
                nombreCliente: `${infoCuenta[0].nombre} ${infoCuenta[0].apellidos}`,
                emailCliente: infoCuentaRec[0].email,
                nombreComercio: nom_comercio,
                nombreSucursal: '',
                conceptos: conceptosMailing,
                puntosTotales: (saldoFinal * puntos_x_peso),
                saldoDinero: saldoFinal,
              }
              if(cuponMailing.length > 0){
                dataMail.cupon = cuponMailing
              }
              let contenidoCorreo = await correoTransaccion(dataMail)
              // SI EL COMERCIO ES MOYO
              // ##################################
              if(id_comercio === 417){
                console.log('El comercio es Moyo')
                dataMail = {
                  nombreCliente: `${infoCuenta[0].nombre} ${infoCuenta[0].apellidos}`,
                  emailCliente: infoCuenta[0].email,
                  nombreComercio: nom_comercio,
                  nombreSucursal: '',
                  puntos: beneficioRecomendacion[0].puntos,
                  puntosTotales: (saldoFinalCuenta * puntos_x_peso),
                  saldoDinero: saldoFinalCuenta
                }
                if(cuponMailing.length > 0){
                  dataMail.cupon = cuponMailing
                }
                contenidoCorreo = await correoTransaccionMoyo(dataMail)
              }
              // ##################################
              // enviamos el correo:
              let dataEnvia = {
                to: infoCuenta[0].email,
                from: { name: nom_comercio, email: 'noreply@loyaltyrefunds.com'},
                subject: '¡Tienes nuevos puntos!',
                text: '¡Tienes nuevos puntos!',
                html: contenidoCorreo,
                categoria_sendgrid: `transaccion_${id_comercio}` 
              }
              let envioCorreo = await sendEmail(dataEnvia)
              console.log('Estatus del envío del correo: ',envioCorreo)
            }
            // ########################################
            let returnObject = {
              error: false,
              message: 'Se asigno el beneficio correctamente'
            }
            return returnObject
          }else{
            let returnObject = {
              error: true,
              message: 'La cuenta ya dio este beneficio a otra persona.'
            }
            return returnObject
          }
        }else{
          let returnObject = {
            error: true,
            message: 'La cuenta de amigo no pertenece a este comercio'
          }
          return returnObject
        }
      }else{
        let returnObject = {
          error: true,
          message: 'No tiene beneficio de Registro'
        }
        return returnObject
      }
    }catch(err){
      return err
    }
  }
}