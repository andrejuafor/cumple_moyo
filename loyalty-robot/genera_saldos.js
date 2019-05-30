'use strict'

//const debug = require('debug')('saldo-vencido:charger')
const {TransactionDetail, DailyBalance} = require('loyalty-db')
const {consultaSaldoAlDia} = require('./lib/saldo')
const {hoyTexto} = require('./lib/misselaneos')


const generaSaldo = async (fecha) => {
  console.log(`***Ejecución de Genera Saldos`)
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
        if(existeSaldoDiario.length === 0){
          //insertamos el saldo diario
          let saldoDiario = await consultaSaldoAlDia(item.cuenta, item.id_comercio,fechaSaldo)
          await DailyBalance.insertSaldoDiario({id_comercio: item.id_comercio, cuenta: item.cuenta, saldo: saldoDiario})
          creado++
        }else{
          if(existeSaldoDiario[0].saldo > 0){
            let saldoDiario = await consultaSaldoAlDia(item.cuenta, item.id_comercio,fechaSaldo)
            await DailyBalance.updateSaldoDiario(item.cuenta, item.id_comercio, saldoDiario)
            actualizado++
          }
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
}

const consultaSaldo = async (fecha, cuenta, id_comercio) => {
  try{
    let saldoDiario = await consultaSaldoAlDia(cuenta, id_comercio,fecha)
    console.log(`Mi saldo es: ${saldoDiario}`)
  }catch(err){
    console.log(err)
  }
}


let misSaldos = generaSaldo('2018-10-04')
//let saldoAhora = consultaSaldo('2018-10-04', '92117', 85)
