'use strict'

const debug = require('debug')('saldo-vencido:charger')
const {Benefit} = require('loyalty-db')
const schedule = require('node-schedule')
const {consultaSaldo} = require('./lib/saldo')
const {hoyTexto} = require('./lib/misselaneos')

let rule = new schedule.RecurrenceRule()

rule.dayOfWeek = parseInt(4)
rule.hour = parseInt(1)
rule.minute = parseInt(10)

const cron = schedule.scheduleJob(rule, async() => {
  console.log(`***Ejecución de Jueves Moyo`)
  try{
    //actualizamos al 6% Moyo Lover Puntos dobles
    let data = {
      activo: "1",
      porcentaje: "6",
      id_beneficio: 123
    }
    //await Benefit.updateBenefit(data);
    //inactivamos el de 10% en puntos 
    let data1 = {
      activo: "0",
      id_beneficio: 117
    }
    //await Benefit.updateBenefit(data1);
    console.log('Actualizamos para el jueves')

  }catch(err){
    console.log(err)
  }
})