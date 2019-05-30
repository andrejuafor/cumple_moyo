'use strict'

const debug = require('debug')('saldo-vencido:charger')
const {TransactionDetail, DailyBalance} = require('loyalty-db')
const schedule = require('node-schedule')
const {consultaSaldoAlDia} = require('./lib/saldo')
const {hoyTexto} = require('./lib/misselaneos')

let rule = new schedule.RecurrenceRule()

rule.hour = parseInt(1)
rule.minute = parseInt(0)

const cron = schedule.scheduleJob({hour:1, minute:10}, async() => {
  console.log(`***Ejecución de Saldo Vencido`)
  try{
    //obtenemos todos los puntos que caducaron un dia antes:
    let puntosCaducados = await TransactionDetail.buscaSaldosVencidos()
    let fechaSaldo = await hoyTexto()
    console.log(`Fecha: ${fechaSaldo}`)
    let actualizado = 0
    let creado = 0
    if(puntosCaducados.length > 0){
      for(let item of puntosCaducados){
        // vemos si está en la tabla de saldo_diario:
        let existeSaldoDiario = await DailyBalance.getSaldoDiario(item.cuenta, item.id_comercio)
        let saldoDiario = await consultaSaldoAlDia(item.cuenta, item.id_comercio,fechaSaldo)
        if(existeSaldoDiario.length === 0){
          //insertamos el saldo diario
          let insertaSaldoDiario = await DailyBalance.insertSaldoDiario({id_comercio: item.id_comercio, cuenta: item.cuenta, saldo: saldoDiario})
          creado++
        }else{
          // actualizamos el saldo diario:
          let actualizaSaldoDiario = await DailyBalance.updateSaldoDiario(item.cuenta, item.id_comercio, saldoDiario)
          actualizado++
        }
      }
      console.log(`Revision del dia: ${fechaSaldo} ; Revisados: ${puntosCaducados.length} ; Creados: ${creado} ; Actualizado: ${actualizado}`)
      //debug(`Revision del dia: ${fechaSaldo} ; Revisados: ${puntosCaducados.length} ; Creados: ${creado} ; Actualizado: ${actualizado}`)
    }else{
      console.log('No se encontraron puntos vencidos')
      //debug('No se encontraron puntos vencidos')
    }
  }catch(err){
    console.log(err)
    //debug(e)
  }
})