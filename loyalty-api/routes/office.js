'use strict'

const express = require('express')
const asyncify = require('express-asyncify')
const Joi = require('joi')

const { joiValidate } = require('../lib/error')
const { Office, Merchant } = require('loyalty-db')
const { validate } = require('../middlewares/middleware')


const routes = asyncify(express.Router())

const bodySearch = Joi.object().keys({
  conditions: Joi.object().keys({
    id_office: Joi.number(),
    name: Joi.string().allow(['',' ']),
    name_exact: Joi.string().allow(['',' ']),
    status: Joi.any().valid([true, false])
  }),
  page_ini: Joi.number().allow(['']),
  page_end: Joi.number().allow([''])
})

const bodyCreate = Joi.object().keys({
  office: Joi.object().keys({
    name: Joi.string().required().label('El nombre es requerido'),
    key: Joi.string().required().label('La clave es requerida'),
    status: Joi.any().valid([true, false]).label('Debe indicar si la sucursal estará activa o inactiva'),
    image: Joi.string().allow(['',' ']),
    address: Joi.string().allow(['', ' ']),
    web: Joi.string().allow(['', ' ']),
    password_account_require: Joi.any().valid([true, false]),
    zip_code: Joi.string().required().label('El codigo postal es requerido')
  })
})

routes.post('/search', validate, async(req, res, next) => {
  console.log('Request a office/search')
  try{
    let { body } = req
    await Joi.validate(body, bodySearch)
    let dataSearch = {
      id_comercio: req.dataLR.id_comercio
    }
    if(body.conditions.id_office !== undefined && body.conditions.id_office !== '') dataSearch.id_sucursal = body.conditions.id_office
    if(body.conditions.name !== undefined && body.conditions.name !== '') dataSearch.nombre = body.conditions.name
    if(body.conditions.name_exact !== undefined && body.conditions.name_exact !== '') dataSearch.nombreExacto = body.conditions.name_exact
    if(body.conditions.status !== undefined && body.conditions.status !== '') dataSearch.activo = body.conditions.status === true ? 1 : 0
    if(body.page_ini !== undefined && body.page_ini !== '' && body.page_end !== undefined && body.page_end !== ''){
      dataSearch.page_ini = body.page_ini
      dataSearch.page_end = body.page_end
    }

    let infoSucursal = await Office.searchOffice(dataSearch)
    let returnObject = {
      error: false,
      total: infoSucursal.length,
      results: infoSucursal
    }
    return res.status(200).send(returnObject)
  }catch(err){
    return next(err)
  }
})

routes.post('/create', validate, async(req, res, next) => {
  console.log('Request a office/create')
  try{
    let { body } = req
    let returnObject = joiValidate(Joi.validate(body, bodyCreate, {abortEarly: false}))
    if(returnObject.error === true){ return res.status(400).json(returnObject) }

    // Validamos si existe la clave:
    let revisaClave = await Office.searchOffice({id_comercio: req.dataLR.id_comercio, clave: body.office.key})
    if(revisaClave.length > 0){ return res.status(400).send({error: true, message: 'La clave ya existe'}) }

    // Vemos si existe una imágen y la subimos al blob:

    // Obtenemos el api_key:

    // Registramos el comercio:

  }catch(err){
    return next(err)
  }
})


module.exports = routes
