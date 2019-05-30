'use strict'

const express = require('express')
const asyncify = require('express-asyncify')
const Joi = require('joi')
const {CuponSerie, CuponCond, Transaction, TransactionDetail, Cupon} = require('loyalty-db')
const {validate} = require('../middlewares/middleware')

const routes = asyncify(express.Router())

const bodyValidate = Joi.object().keys({
  conditions: Joi.object().keys({
    account: Joi.string().required(),
    code: Joi.string().required()
  }).required()
})

const bodySearch = Joi.object().keys({
  conditions: Joi.object().keys({
    id: Joi.string(),
    name: Joi.string()
  }).required()
})

const bodyCuponValidate = Joi.object().keys({
  conditions: Joi.object().keys({
    id: Joi.number().required()
  }).required()
})

routes.post('/validate', validate, async(req, res, next) => {
  console.log('Request a coupon/Validate')
  try{
    const {body} = req
    console.log(body)
    await Joi.validate(body, bodyValidate)
    let dataCuponSerie = {
      codigo: body.conditions.code,
      id_comercio: req.dataLR.id_comercio
    }
    let detalle_cupon = await CuponSerie.searchCuponSerieCupon(dataCuponSerie)
    if(detalle_cupon.length === 0) {
      // si no existe mandamos error
      let returnObject = {
        error: true,
        message: 'El cupón es inválido'
      }  
      return res.status(400).send(returnObject)
    }else{

      // validamos que se encuentre vigente
      if(detalle_cupon[0].vigencia !== 'Sin vigencia'){
        let vigenciaCupon = new Date(detalle_cupon[0].vigencia)
        let hoy = new Date()
        if(vigenciaCupon < hoy){
          let returnObject = {
            error: true,
            message: 'El cupón se encuentra vencido'
          }
          return res.status(400).send(returnObject)
        }
      }
    }
    // VALIDA QUE EL CUPÓN NO HAYA SIDO UTILIZADO CUANDO EL CUPÓN NO ES GENERICO:
    if(detalle_cupon[0].generico === 0){
      // vemos si el cupon no se ha usado:
      let dataCuponUsado = {
        id_cupon_serie: detalle_cupon[0].id_cupon_serie
      }
      let cupon_usado = await TransactionDetail.searchTransactionDetail(dataCuponUsado)
      
      if(cupon_usado.length > 0){
        let returnObject = {
            error: true,
            message: 'El cupón ya fue usado'
        }    
        return res.status(400).send(returnObject)
      }
    }
    // VALIDA CUPÓN GENERICO Y UNICO POR CUENTA:
    if(detalle_cupon[0].generico === 1 && detalle_cupon[0].unico_cuenta === 1){

      let dataCuponUsado = {
        id_cupon_serie: detalle_cupon[0].id_cupon_serie,
        cuenta: body.conditions.account
      }
      let cupon_usado = await Transaction.searchTransactionComplete(dataCuponUsado)
      if(cupon_usado.length > 0){
          let returnObject = {
            error: true,
            message: 'El cupón ya fue usado'
          }      
          return res.status(400).send(returnObject)
      }
    }
    // CHECAMOS LAS CONDICIONES DEL CUPON:
    let dataCuponCond = {
      id_cupon: detalle_cupon[0].id_cupon
    }
    let condicionesCupon = await CuponCond.searchCuponCond(dataCuponCond)
    if(condicionesCupon.length === 0){

      let returnObject = {
        error: false,
        results: detalle_cupon,
        message: 'Cupón válido'
      }  
      return res.status(200).send(returnObject) 
    }else{

      let hoy = new Date()
      let diaSemana = hoy.getDay() + 1
      let diaMes = hoy.getDay()
      // let mesHoy = hoy.getMonth()
      let tiempo = hoy.getTime()
      let validacionCondiciones = true
      for(let item of condicionesCupon){
        if(item.var === 'dias-semana'){
          for(dias of item.val1.split(',')){
            if(dias === diaSemana) validacionCondiciones = false
          }
        }
        if(item.var === 'dias-mes'){
          for(dias of item.val1.split(',')){
            if(dias === diaMes) validacionCondiciones = false 
          }
        }
        if(item.var === 'rango-dias'){
          if(diaMes < item.val1 || diaMes > item.val2) validacionCondiciones = false
        }
        if(item.var === 'rango-fechas'){
          let fecha1 = new Date(item.val1)
          let fecha2 = new Date(item.val2)
          if(hoy < fecha1 || hoy > fecha2) validacionCondiciones = false
        }
        if(item.var === 'horas'){
          let hoyString = toString(hoy)
          let horas = item.val1.split(',')
          let fecha1 = new Date(`${hoyString} ${horas[0]}`)
          let fecha2 = new Date(`${hoyString} ${horas[1]}`)

          if(tiempo < fecha1.getTime() || tiempo > fecha2.getTime()) validacionCondiciones = false
        }
      }
      if(validacionCondiciones === true){
        let returnObject = {
          cuponValido: true,
          infoCupon: detalle_cupon[0],
          message: 'Cupón válido'
        }    
        return res.status(200).send(returnObject)
      }else{
        let returnObject = {
          error: true,
          message: 'El cupón no puede ser utilizado'
        }    
        return res.status(400).send(returnObject)
      }
    }
  }catch(err){
    return next(err)
  }
})

routes.post('/campaign_validate', validate, async(req, res, next) => {
  console.log('Request a coupon/campaign_validate')
  try{
    const {body} = req
    await Joi.validate(body, bodyCuponValidate)
    let result = await Cupon.searchById(body.conditions.id, req.dataLR.id_comercio)
    if(result.length === 0){
      return res.status(400).send({error: true, message: 'Campaña de correo no encontrada'})
    }else{
        if(result[0].vig === '1'){
          return res.status(200).send({error: false, message: 'ok', results: result})
        }else{
          return res.status(400).send({error: true, message: 'La capaña no está vigente'})
        }
    }
  }catch(err){
    return next(err)
  }
})

module.exports = routes