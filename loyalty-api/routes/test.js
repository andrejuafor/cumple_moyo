'use strict'

const express = require('express')
const asyncify = require('express-asyncify')
const Joi = require('joi')
const {Category} = require('loyalty-db')
const {validate} = require('../middlewares/middleware')

const routes = asyncify(express.Router())

const bodySearch = Joi.object().keys({
  category_id: Joi.number()
})

routes.post('/search', validate, async(req, res, next) => {
  console.log('Request a test/search')
  try{
    // validamos el header:
    const {conditions} = req.body
    let validate = await Joi.validate(conditions, bodySearch)
    conditions.id_comercio = req.dataLR.id_comercio
    let categorias = await Category.searchCategory(conditions)
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