'use strict'

const debug = require('debug')('saldo-vencido:charger')
const {Benefit} = require('loyalty-db')
const schedule = require('node-schedule')
const {consultaSaldo} = require('./lib/saldo')
const {hoyTexto} = require('./lib/misselaneos')

let rule = new schedule.RecurrenceRule()

rule.dayOfWeek = parseInt(4)
rule.hour = parseInt(23)
rule.minute = parseInt(59)

const cron = schedule.scheduleJob(rule, async() => {
  console.log(`***Regresamos valores de Puntos Dobles`)
  try{
    //actualizamos al 15% Moyo Lover Puntos dobles
    let data = {
      activo: "1",
      porcentaje: "15",
      id_beneficio: 123
    }
    //let result = await Benefit.updateBenefit(data);
    
    //activamos el de 10% en puntos 
    let data1 = {
      activo: "1",
      id_beneficio: 117
    }
    //await Benefit.updateBenefit(data1);

    console.log('Actualizamos para Puntos Dobles')
  }catch(err){
    console.log(err)
  }
})