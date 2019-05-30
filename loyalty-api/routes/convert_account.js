'use strict'

const express = require('express')
const asyncify = require('express-asyncify')
const Joi = require('joi')
const {User} = require('loyalty-db')

const routes = asyncify(express.Router())

const bodyAccount = Joi.object().keys({
  account: Joi.string().required(),
  password: Joi.string()
})

routes.post('/', async(req, res, next) =>{
  try{
    //convertimos los datos a base64
    let {conditions} = req.body
    let validate = Joi.validate(conditions, bodyAccount)
    var auth = Buffer.from(conditions.account + ':' + conditions.password).toString('base64');
    let returnObject = {
      resp: auth
    }
    return res.status(200).send(returnObject)
  }catch(err){
    return next(err)
  }
})

routes.get('/testing', async(req, res, next) => {
  let valores = [{ account: '416278972', password:  '14430' },{ account: '726286686', password:  '03100' },{ account: '237632602', password:  '05210' },{ account: '77719865', password:  '03020' },{ account: '77755857', password:  '11410' },{ account: '34565828', password:  '09890' },{ account: '714476852', password:  '09060' },{ account: '554549818', password:  '56620' },{ account: '14680989', password:  '80950' },{ account: '80652572', password:  '96700' },{ account: '114572703', password:  '07300' },{ account: '77726008', password:  '09740' },{ account: '591257351', password:  '04890' },{ account: '83993341', password:  '07980' },{ account: '7770172', password:  '14390' },{ account: '77776173', password:  '09830' },{ account: '33330832', password:  '03100' },{ account: '7743582', password:  '05120' },{ account: '7730517', password:  '02070' },{ account: '7781072', password:  '94295' },{ account: '147774339', password:  '52763' },{ account: '121976792', password:  '14300' },{ account: '043961501', password:  '52990' },{ account: '7750480', password:  '91000' },{ account: '7771886', password:  '04918' },{ account: '389932666', password:  '58000' },{ account: '64672631', password:  '52779' },{ account: '85171971', password:  '02980' },{ account: '7788132', password:  '55245' },{ account: '169953951', password:  '53950' },{ account: '814852989', password:  '55260' },{ account: '189484035', password:  '11000' },{ account: '412361335', password:  '01030' },{ account: '77776202', password:  '57000' },{ account: '002807590', password:  '37170' },{ account: '578159573', password:  '04480' },{ account: '32929796', password:  '72130' },{ account: '478484007', password:  '07380' },{ account: '265137914', password:  '81228' },{ account: '269823275', password:  '52990' },{ account: '266484556', password:  '03810' },{ account: '754129926', password:  '52764' },{ account: '77749768', password:  '97114' },{ account: '243586447', password:  '04380' },{ account: '34913702', password:  '72490' },{ account: '635894731', password:  '29200' },{ account: '296571115', password:  '09400' },{ account: '715479698', password:  '05130' },{ account: '7796849', password:  '08500' },{ account: '521486901', password:  '13200' }]
  let respuesta = ''
  for(let item of valores){
    respuesta += Buffer.from(item.account + ':' + item.password).toString('base64') + ',';
  }
  let returnObject = {
    error: false,
    results : respuesta
  }
  return res.status(200).send(returnObject)
})

routes.post('/updatePass', async(req, res, next) => {
  try{
    //Primero buscamos todos los usuarios:
    let dataUsuarios = {}
    let allUsers = await User.searchUserAdmin(dataUsuarios)
    for(let item of allUsers){
      let actualizaUsuario = await User.updateUser({password:item.pass})
    }
  }catch(err){
    return err
  }
})

module.exports = routes