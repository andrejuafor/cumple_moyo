'use strict'

const{Account, Transaction, TransactionDetail, BenefitRegistry, createTransactionDetail} = require('loyalty-db')

module.exports = {
  async beneficioCumpleRegistro(comercio, sucursal, cuenta){
    try{
      /**
       * Dia del mes: 1
       * No de dias antes: 2
       * Fin de mes: 3
       */
      //Primero vemos si el comercio tiene beneficio de cumple por dia del mes y fin de mes.
      let beneficioCumple = await BenefitRegistry.searchBirthday({comercio: comercio})
      
      if(beneficioCumple.length > 0){
        // vemos si su dia de cumpleaños ya pasó:
        let infoCuenta = await Account.infoAccount({account: cuenta})
        // Rompemos la fecha de nacimiento:
        let fechaNacimiento = infoCuenta[0].fecha_nacimiento.split('-')

        if(fechaNacimiento[1] > 0 && fechaNacimiento[2] > 0){
          let ahora = new Date()
          ahora.setDate(ahora.getDate() + dias)
          let month = ahora.getMonth()+1
          let year = ahora.getFullYear()
          if(beneficioCumple[0].tipo_cumple === 1){
            let fechaNacimientoHoy = Date(`2018-${fechaNacimiento[1]}-${fechaNacimiento[2]}`)
            let fechaBeneficio = new Date(`${year}-${month}-${beneficioCumple[0].dias_cumple}`)
            // Hoy es 08-01-2018
            // Mi cumple: 08-01-2018 ; Fecha proceso: 8 de cada mes: Aplica
            // Mi cumple: 07-01-2018 o antes ; Fecha proceso: 8 de cada mes: Aplica
            // Mi cumple: 07-01-2018 o antes ; Fecha proceso: 10 de cada mes: No Aplica
            // Mi cumple: 20-01-2018 o antes ; Fecha proceso: 10 de cada mes: Aplica
            
            if((fechaNacimientoHoy >= fechaBeneficio) && (month === fechaNacimiento[1])){
              // Aplicamos beneficio de dia del mes
              let dataTransaction = {
                id_usuario: null,
                cuenta: cuenta,
                id_sucursal: sucursal,
                puntos: Math.round(Number(beneficioCumple[0].puntos)),
                referencia: beneficioCumple[0].nombre,
                concepto: beneficioCumple[0].nombre,
                total: 0
              }
              let altaTransaccionBeneficioMonto = await Transaction.createTransaction(dataTransaction)
              let dataTransactionDetail = {
                id_transaccion: altaTransaccionBeneficioMonto.insertId,
                id_punto: null,
                referencia: beneficioCumple[0].nombre,
                concepto: beneficioCumple[0].nombre,
                puntos: Math.round(Number(beneficioCumple[0].puntos)),
                porcentaje: 1,
                vigencia: beneficioCumple[0].vigencia,
                total: 0,
                id_cupon_serie: null
              }
              await TransactionDetail.createTransactionDetail(dataTransactionDetail)
              // Enviamos el mail
              // #################################

              // #################################
              let returnObject = {
                error: false,
                message: 'Se otorgó el beneficio de cumpleaños'
              }
              return returnObject
            }else{
              let returnObject = {
                error: true,
                message: 'Aún está a tiempo de recibir su beneficio ó no es su mes de cumpleaños'
              }
              return returnObject
            }
          }else{
            // vemos si estamos en el mes de su cumpleaños:
            if(month === fechaNacimiento[1]){
              // Se le otorga el beneficio de fin de mes
              let dataTransaction = {
                id_usuario: null,
                cuenta: cuenta,
                id_sucursal: sucursal,
                puntos: Math.round(Number(beneficioCumple[0].puntos)),
                referencia: beneficioCumple[0].nombre,
                concepto: beneficioCumple[0].nombre,
                total: 0
              }
              let altaTransaccionBeneficioMonto = await Transaction.createTransaction(dataTransaction)
              let dataTransactionDetail = {
                id_transaccion: altaTransaccionBeneficioMonto.insertId,
                id_punto: null,
                referencia: beneficioCumple[0].nombre,
                concepto: beneficioCumple[0].nombre,
                puntos: Math.round(Number(beneficioCumple[0].puntos)),
                porcentaje: 1,
                vigencia: beneficioCumple[0].vigencia,
                total: 0,
                id_cupon_serie: null
              }
              await TransactionDetail.createTransactionDetail(dataTransactionDetail)
              // Enviamos el mail
              // #################################

              // #################################
              
              let returnObject = {
                error: false,
                message: 'Se otorgó el beneficio de cumpleaños'
              }
              return returnObject
            }else{
              let returnObject = {
                error: false,
                message: 'No es su mes de cumpleaños'
              }
              return returnObject
            }
          }
        }else{
          let returnObject = {
            error: true,
            message: 'No tiene una fecha de nacimiento valida'
          }
          return returnObject
        }
      }else{
        let returnObject = {
          error: true,
          message: "No tiene beneficio de cumpleaños que aplique."
        }
        return returnObject
      }
    }catch(err){
      return err
    }
  }
}