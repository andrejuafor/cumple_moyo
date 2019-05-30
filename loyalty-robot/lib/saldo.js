'use strict'

const {Transaction, DailyBalance} = require('loyalty-db')
// const fs = require('fs')
// fs.appendFileSync('log.txt', '\n Estoy entrando con este saldo: '+saldo_pendiente)
// const {map} = require('p-iteration')

module.exports = {
  async consultaSaldo (cuenta, id_comercio, fecha) {
    console.log(`Proceso de consulta de saldo consultaSaldo: ${cuenta}`) 
    try{
      // vemos si ya tiene saldo al dia:
      let saldoAlDia = await DailyBalance.getSaldoDiario(cuenta, id_comercio)
      if(saldoAlDia.length === 1){
        let saldo = saldoAlDia[0].saldo
        return saldo
      }else{
        // obtenemos el saldo:
        let transacciones_usadas = []
        let saldo_favor = ''
        let saldo = 0
        let sobro = 0
        // Obtenemos las transacciones de pago con puntos:
        let transactionsPaymentPoints = await Transaction.transactionsPaymentPoints(cuenta, fecha, id_comercio)
        let objetoFinal = {
          transacciones:[]
        }
        for (let item of transactionsPaymentPoints){
          let transactionCalculatePoints = await Transaction.transactionCalculatePoints(cuenta, id_comercio, item.fecha, transacciones_usadas)
          objetoFinal.transacciones.push({transaccion:item.id_transaccion ,saldo_pendiente: item.puntos,transactionCalculatePoints: transactionCalculatePoints} )
        }
        for(let item1 = 0; item1 < objetoFinal.transacciones.length; item1++){
          let saldo_pendiente = Math.abs(Number(objetoFinal.transacciones[item1].saldo_pendiente))
          let i = true
          let contador = 0
          if(objetoFinal.transacciones[item1].transactionCalculatePoints.length > 0){
            while((i) && (objetoFinal.transacciones[item1].transactionCalculatePoints.length > contador)){
              if(transacciones_usadas.indexOf(objetoFinal.transacciones[item1].transactionCalculatePoints[contador].id_transaccion_detalle) === -1){
                let disp = objetoFinal.transacciones[item1].transactionCalculatePoints[contador].puntos
                if(saldo_pendiente > 0){
                  if(saldo_favor !== ''){
                    let saldoFavor = saldo_favor.split(';')
                    if(Number(saldoFavor[0]) === objetoFinal.transacciones[item1].transactionCalculatePoints[contador].id_transaccion_detalle){
                      saldo_favor = ''
                      saldo_pendiente -= Number(saldoFavor[1])
                      if(saldo_pendiente > 0){
                        transacciones_usadas.push(objetoFinal.transacciones[item1].transactionCalculatePoints[contador].id_transaccion_detalle)
                      }else if(saldo_pendiente === 0){
                        transacciones_usadas.push(objetoFinal.transacciones[item1].transactionCalculatePoints[contador].id_transaccion_detalle)
                        saldo_pendiente = 0
                        i = false
                      }else if(saldo_pendiente < 0){
                        saldo_favor = objetoFinal.transacciones[item1].transactionCalculatePoints[contador].id_transaccion_detalle + ';' + (saldo_pendiente * -1) + ';' + objetoFinal.transacciones[item1].transactionCalculatePoints[contador].vig
                        saldo_pendiente = 0
                        i = false
                      }
                    }else{
                      saldo_pendiente -= Number(disp)
                      if(saldo_pendiente > 0){
                        transacciones_usadas.push(objetoFinal.transacciones[item1].transactionCalculatePoints[contador].id_transaccion_detalle)
                      }else if(saldo_pendiente === 0){
                        transacciones_usadas.push(objetoFinal.transacciones[item1].transactionCalculatePoints[contador].id_transaccion_detalle)
                        saldo_pendiente = 0
                        i = false
                      }else if(saldo_pendiente < 0){
                        saldo_favor = objetoFinal.transacciones[item1].transactionCalculatePoints[contador].id_transaccion_detalle + ';' + (saldo_pendiente * -1) + ';' + objetoFinal.transacciones[item1].transactionCalculatePoints[contador].vig
                        saldo_pendiente = 0
                        i = false
                      }
                    }
                    //Fin del saldo favor inexistente
                  }else{
                    saldo_pendiente -= Number(disp)
                    if(saldo_pendiente > 0){
                      transacciones_usadas.push(objetoFinal.transacciones[item1].transactionCalculatePoints[contador].id_transaccion_detalle)
                    }else if(saldo_pendiente === 0){
                      transacciones_usadas.push(objetoFinal.transacciones[item1].transactionCalculatePoints[contador].id_transaccion_detalle)
                      saldo_pendiente = 0
                      i = false
                    }else if(saldo_pendiente < 0){
                      saldo_favor = objetoFinal.transacciones[item1].transactionCalculatePoints[contador].id_transaccion_detalle + ';' + (saldo_pendiente * -1) + ';' + objetoFinal.transacciones[item1].transactionCalculatePoints[contador].vig
                      saldo_pendiente = 0
                      i = false
                    }
                  }
                }
              }
              contador ++
              // Fin del while
            }
          }
          
        }
        if(saldo_favor !== ''){
          let saldoFavor = saldo_favor.split(';')
          saldo_favor = ''
          let fechaSaldoFavor = new Date(saldoFavor[2])
          let fechaFuncion = new Date(fecha)
          if(fechaSaldoFavor >= fechaFuncion || saldoFavor[2] === ''){
            sobro = Number(saldoFavor[1])
            transacciones_usadas.push(saldoFavor[0])
          }
        }
        // Falta el ultimo paso del saldo
        let transactionPointsFree = await Transaction.transactionPointsFree(cuenta, fecha, transacciones_usadas, id_comercio)
        let vigentes = Number(transactionPointsFree[0].total)
        saldo += vigentes
        saldo += sobro
        // insertamos el saldoDiario:
        //let insertaSaldo = await DailyBalance.insertSaldoDiario({id_comercio: id_comercio, cuenta: cuenta, saldo: saldo})
        return saldo
      }
    } catch(err) {
      return err
    }
  },
  async consultaSaldoAlDia (cuenta, id_comercio, fecha) {
    console.log(`Proceso de consulta de saldo consultaSaldoAlDia: ${cuenta}`) 
    try{
      // obtenemos el saldo:
      let transacciones_usadas = []
      let saldo_favor = ''
      let saldo = 0
      let sobro = 0
      // Obtenemos las transacciones de pago con puntos:
      let transactionsPaymentPoints = await Transaction.transactionsPaymentPoints(cuenta, fecha, id_comercio)
      let objetoFinal = {
        transacciones:[]
      }
      for (let item of transactionsPaymentPoints){
        let transactionCalculatePoints = await Transaction.transactionCalculatePoints(cuenta, id_comercio, item.fecha, transacciones_usadas)
        objetoFinal.transacciones.push({transaccion:item.id_transaccion ,saldo_pendiente: item.puntos,transactionCalculatePoints: transactionCalculatePoints} )
      }
      for(let item1 = 0; item1 < objetoFinal.transacciones.length; item1++){
        let saldo_pendiente = Math.abs(Number(objetoFinal.transacciones[item1].saldo_pendiente))
        let i = true
        let contador = 0
        if(objetoFinal.transacciones[item1].transactionCalculatePoints.length > 0){
          while((i) && (objetoFinal.transacciones[item1].transactionCalculatePoints.length > contador)){
            if(transacciones_usadas.indexOf(objetoFinal.transacciones[item1].transactionCalculatePoints[contador].id_transaccion_detalle) === -1){
              let disp = objetoFinal.transacciones[item1].transactionCalculatePoints[contador].puntos
              if(saldo_pendiente > 0){
                if(saldo_favor !== ''){
                  let saldoFavor = saldo_favor.split(';')
                  if(Number(saldoFavor[0]) === objetoFinal.transacciones[item1].transactionCalculatePoints[contador].id_transaccion_detalle){
                    saldo_favor = ''
                    saldo_pendiente -= Number(saldoFavor[1])
                    if(saldo_pendiente > 0){
                      transacciones_usadas.push(objetoFinal.transacciones[item1].transactionCalculatePoints[contador].id_transaccion_detalle)
                    }else if(saldo_pendiente === 0){
                      transacciones_usadas.push(objetoFinal.transacciones[item1].transactionCalculatePoints[contador].id_transaccion_detalle)
                      saldo_pendiente = 0
                      i = false
                    }else if(saldo_pendiente < 0){
                      saldo_favor = objetoFinal.transacciones[item1].transactionCalculatePoints[contador].id_transaccion_detalle + ';' + (saldo_pendiente * -1) + ';' + objetoFinal.transacciones[item1].transactionCalculatePoints[contador].vig
                      saldo_pendiente = 0
                      i = false
                    }
                  }else{
                    saldo_pendiente -= Number(disp)
                    if(saldo_pendiente > 0){
                      transacciones_usadas.push(objetoFinal.transacciones[item1].transactionCalculatePoints[contador].id_transaccion_detalle)
                    }else if(saldo_pendiente === 0){
                      transacciones_usadas.push(objetoFinal.transacciones[item1].transactionCalculatePoints[contador].id_transaccion_detalle)
                      saldo_pendiente = 0
                      i = false
                    }else if(saldo_pendiente < 0){
                      saldo_favor = objetoFinal.transacciones[item1].transactionCalculatePoints[contador].id_transaccion_detalle + ';' + (saldo_pendiente * -1) + ';' + objetoFinal.transacciones[item1].transactionCalculatePoints[contador].vig
                      saldo_pendiente = 0
                      i = false
                    }
                  }
                  //Fin del saldo favor inexistente
                }else{
                  saldo_pendiente -= Number(disp)
                  if(saldo_pendiente > 0){
                    transacciones_usadas.push(objetoFinal.transacciones[item1].transactionCalculatePoints[contador].id_transaccion_detalle)
                  }else if(saldo_pendiente === 0){
                    transacciones_usadas.push(objetoFinal.transacciones[item1].transactionCalculatePoints[contador].id_transaccion_detalle)
                    saldo_pendiente = 0
                    i = false
                  }else if(saldo_pendiente < 0){
                    saldo_favor = objetoFinal.transacciones[item1].transactionCalculatePoints[contador].id_transaccion_detalle + ';' + (saldo_pendiente * -1) + ';' + objetoFinal.transacciones[item1].transactionCalculatePoints[contador].vig
                    saldo_pendiente = 0
                    i = false
                  }
                }
              }
            }
            contador ++
            // Fin del while
          }
        }
        
      }
      if(saldo_favor !== ''){
        let saldoFavor = saldo_favor.split(';')
        saldo_favor = ''
        let fechaSaldoFavor = new Date(saldoFavor[2])
        let fechaFuncion = new Date(fecha)
        if(fechaSaldoFavor >= fechaFuncion || saldoFavor[2] === ''){
          sobro = Number(saldoFavor[1])
          transacciones_usadas.push(saldoFavor[0])
        }
      }
      // Falta el ultimo paso del saldo
      let transactionPointsFree = await Transaction.transactionPointsFree(cuenta, fecha, transacciones_usadas, id_comercio)
      let vigentes = Number(transactionPointsFree[0].total)
      saldo += vigentes
      saldo += sobro
      
      return saldo
    } catch(err) {
      return err
    }
  }
}