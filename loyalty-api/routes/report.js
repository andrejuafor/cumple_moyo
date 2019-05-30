'use strict'

const express = require('express')
const asyncify = require('express-asyncify')
const Joi = require('joi')
const fs = require('fs')
const path = require('path')
const multer = require('multer')({
  dest:'public'
})
const parse = require('csv-parse')
const csv = require('fast-csv')
const uuidV4 = require('uuid/v4')
const Json2csvParser = require('json2csv').Parser;

const {
      Account,
      ConsultaLibre,
      Report
} = require('loyalty-db')

const {consultaSaldo} = require('../lib/saldo')

const bodyAccountReport = Joi.object().keys({
	report: Joi.object().keys({
		office: Joi.any(),
		account: Joi.string().allow(['']),
		name: Joi.string().allow(['']),
		email: Joi.string().allow(['']),
		cel: Joi.string().allow(['']),
		zip_code: Joi.string().allow(['']),
		gender: Joi.string().allow(['']),
		member_date: Joi.string().allow(['']),
		day_birthday: Joi.string().allow(['']),
		mont_birthday: Joi.string().allow(['']),
		year_birthday: Joi.string().allow(['']),

		total_consumption: Joi.string().allow(['']),
		total_consumption_up: Joi.string().allow(['']),
		average_monthly_consumption_since: Joi.string().allow(['']),
		average_monthly_consumption_up: Joi.string().allow(['']),
		last_month_consumption_since: Joi.string().allow(['']),
		last_month_consumption_up: Joi.string().allow(['']),
		month_consumption_since: Joi.string().allow(['']),
		month_consumption_up: Joi.string().allow(['']),
		average_consumption_visit_since: Joi.string().allow(['']),
		average_consumption_visit_up: Joi.string().allow(['']),
		average_spending_visit_since: Joi.string().allow(['']),
		average_spending_visit_up: Joi.string().allow(['']),
		average_monthly_visit_since: Joi.string().allow(['']),
		average_monthly_visit_up: Joi.string().allow(['']),
		visits_since: Joi.string().allow(['']),
		visits_up: Joi.string().allow(['']),
		visits_ma_since: Joi.string().allow(['']),
		visits_ma_up: Joi.string().allow(['']),
		age_since: Joi.string().allow(['']),
		age_up: Joi.string().allow(['']),

		range_transaction:Joi.array(),

		page_ini: Joi.number(),
		page_end: Joi.number(),
		export_file: Joi.any().valid([true, false]).required(),

	}).required()
});

const bodySaldos = Joi.object().keys({
  conditions: Joi.object().keys({
    merchant: Joi.number().required()
  })
})


const routes = asyncify(express.Router())

routes.post('/account', async(req, res, next) => {
  console.log('Request a report/account')
  try{
    let {body} = req
    await Joi.validate(body, bodyAccountReport)
    let result = await Report.reportAccount(body)

  }catch(err){
    return next(err)
  }
})

routes.post('/saldo', async(req, res, next) => {
  console.log('Request a report/saldos')
  req.setTimeout(0)
  try{
    let body = req.body
    console.log(body)
    await Joi.validate(body, bodySaldos)

    //Primero buscamos las cuentas del comercio:
    let sql = `SELECT numero as cuenta, nombre, apellidos
                FROM cuenta 
                WHERE numero IN (
                                  SELECT numero 
                                  FROM sucursal_cuenta 
                                  WHERE id_sucursal IN (SELECT id_sucursal from sucursal WHERE id_comercio = ${body.conditions.merchant})
                                )`
    let result = await ConsultaLibre.consulta(sql)
    //vamos revisando cuenta por cuenta para obtener el saldo de cada una:
    let returnObject = {
      error: false
    }
    let cuentas = []
    for(let item of result){
      let saldoActual = await consultaSaldo(item.cuenta,body.conditions.merchant,'')
      console.log(item)
      cuentas.push({cuenta: item.cuenta, nombre: item.nombre, apellidos: item.apellidos, saldo: saldoActual})
    }
    console.log('Terminamos con las cuentas')
    // returnObject.total = cuenta.length
    // returnObject.result = cuentas
    // return res.status(200).send(returnObject)

    let nombreArchivo = `rep_saldos_29-04-2019_audiomundo.csv`
    let file = path.join('public/', nombreArchivo)
    
    // Generamos el archivo
    const fields = ['cuenta','nombre','apellido','saldo']
    const json2csvParser = new Json2csvParser({ fields });
    let datosCsv = json2csvParser.parse(cuentas);
    datosCsv = datosCsv.replace(/["']/g, "")
    fs.writeFileSync(`public/${nombreArchivo}`,datosCsv)

    // Generamos la descarga:
    let archivoValido = false
    if(fs.accessSync(file)) {
      archivoValido = true
    }
    
    res.setHeader('Content-disposition', `attachment; filename=${nombreArchivo}`);
    res.set('Content-Type', 'text/csv');
    console.log('Terminamos')
    return res.status(200).download(file);
  }catch(err){
    return next(err)
  }
})

module.exports = routes