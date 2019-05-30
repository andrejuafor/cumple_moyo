'use strict'

const express = require('express')
const asyncifi = require('express-asyncify')
const Joi = require('joi')
const {User, Merchant, OfficeAccount, DailyBalance} = require('loyalty-db')
const {consultaSaldo} = require('../lib/saldo')
const {hoyTexto} = require('../lib/misselaneos')
const CryptoJS = require('crypto-js')


const routes = asyncifi(express.Router())
//ESTE PROCESO SERVIRÁ PARA ACTUALIZAR LAS CONTRASEÑAS DE TODAS LAS CUENTAS Y  PARA EL LLENADO DEL SALDO AL DIA.

routes.post('/act_pass', async(req, res, next) => {
  console.log('Creación de contraseñas para cuentas')
  try{
    //primero consultamos todas las cuentas:
    let listadoCuentas = await User.searchUserAdmin({sinClave:1})
    for(let item of  listadoCuentas){
      let actualizaCuenta = await User.updateUser({id_usuario: item.id_usuario, clave: CryptoJS.SHA256(item.clave).toString()})
    }
    let returnObject = {
      error:false,
      message: 'ok'
    }
    return res.status(200).send(returnObject)
  }catch(err){
    return err
  }
})

routes.post('/carga_puntos', async (req, res, next) => {
  console.log('Carga de salgos para saldo al dia')
  try{
    //Primero obtenemos todos los comercios:
    let listaComercios = await Merchant.searchMerchant({})
    for(let item of listaComercio){
      //ahora vamos insertando cuenta por cuenta por comercio:
      //consutamos todas las cuentas del comercio:
      let cuentasComercio = await OfficeAccount.cuentasSaldoDia(item.id_comercio)
      for(let item2 of cuentasComercio){
        //buscamos el saldo:
        let fechaSaldo = await hoyTexto()
        // ahora obtenemos el saldo
        let saldoResult = await consultaSaldo(item2.numero, item.id_comercio, fechaSaldo)
        let insertaSaldo = await DailyBalance.insertSaldoDiario({id_comercio:item.id_comercio, cuenta: item2.numero, saldo: saldoResult})
      }
    }
    let returnObject = {
      error: false,
      message: 'ok'
    }
    return res.status(200).send(returnObject)
  }catch(err){
    return err
  }
})


module.exports = routes
