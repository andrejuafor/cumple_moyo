'use strict'

const express = require('express')
const asyncify = require('express-asyncify')
const Joi = require('joi')
const {Category} = require('loyalty-db')
const {validate} = require('../middlewares/middleware')

const routes = asyncify(express.Router())

const bodySearch = Joi.object().keys({
  conditions: Joi.object().keys({
    category_id: Joi.number(),
    active: Joi.any().valid([true, false]).required()
  }).required()
})

routes.post('/search', validate, async(req, res, next) => {
  console.log('Request a category/search')
  try{
    // validamos el header:
    const {body} = req
    await Joi.validate(body, bodySearch)
    body.conditions.id_comercio = req.dataLR.id_comercio
    if(req.dataLR.id_sucursal !== undefined && req.dataLR.id_sucursal !== ''){
      body.conditions.id_sucursal = req.dataLR.id_sucursal
    }

    if(body.conditions.active){
      var categorias = await Category.activeCategory(body.conditions)
    }else{
      var categorias = await Category.searchCategory(body.conditions)
    }
    
    let returnObject = {
      error: false,
      total: categorias.length,
      results: categorias
    }
    return res.status(200).send(returnObject)
  }catch(err){
    next(err)
  }
})

module.exports = routes