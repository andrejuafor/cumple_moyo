'use strict'

const express = require('express')
const asyncifi = require('express-asyncify')
const Joi = require('joi')
const {Login, User, License, UserProfile, Office, Merchant} = require('loyalty-db')
const auth = require('basic-auth')
const config = require('../../loyalty-db/config')
const SHA256 = require("crypto-js/sha256");

const routes = asyncifi(express.Router())
const buscaMerchantUsuario = async (id_usuario) => {
  try{
    let infoMerchant = await User.merchantOfficeUser(id_usuario)
    if(infoMerchant.length === 0){
      infoMerchant = await User.merchantAdmin(id_usuario)
    }
    return infoMerchant
  }catch(err){
    return err
  }
}
function userMenu(profile){
  let permiso = {}
  if(profile === 'consulta'){
    permiso.eliminaTransaccion = false
    permiso.muestraSucursal = false
    permiso.menu = {
      check_balance: true,
      points: false,
      redeem_coupon: false,
      report_transaction: false,
      transaction: false,
      purse: false,
      reg_edit_account: true,
      accounts: false,
      load_transactions: false,
      load_accounts: false,
      mailing: false
    }
  }else if(profile === 'capturista'){
    permiso.eliminaTransaccion = false
    permiso.muestraSucursal = false
    permiso.menu = {
      check_balance: true,
      points: true,
      redeem_coupon: true,
      report_transaction: true,
      transaction: false,
      purse: false,
      reg_edit_account: false,
      accounts: false,
      load_transactions: false,
      load_accounts: false,
      mailing: false
    }
  }else if(profile === 'operador'){
    permiso.eliminaTransaccion = false
    permiso.muestraSucursal = false
    permiso.menu = {
      check_balance: true,
      points: true,
      redeem_coupon: true,
      report_transaction: true,
      transaction: true,
      purse: true,
      reg_edit_account: true,
      accounts: false,
      load_transactions: true,
      load_accounts: true,
      mailing: false
    }
  }else if(profile === 'monedero'){
    permiso.eliminaTransaccion = false
    permiso.muestraSucursal = false
    permiso.menu = {
      check_balance: true,
      points: true,
      redeem_coupon: true,
      report_transaction: true,
      transaction: false,
      purse: true,
      reg_edit_account: true,
      accounts: false,
      load_transactions: true,
      load_accounts: true,
      mailing: false
    }
  }else if(profile === 'supervisor'){
    permiso.eliminaTransaccion = false
    permiso.muestraSucursal = false
    permiso.menu = {
      check_balance: true,
      points: true,
      redeem_coupon: true,
      report_transaction: true,
      transaction: true,
      purse: true,
      reg_edit_account: false,
      accounts: true,
      load_transactions: true,
      load_accounts: true,
      mailing: false
    }
  }else if(profile === 'gerente' || profile === 'sucursal'){
    permiso.eliminaTransaccion = true
    permiso.muestraSucursal = false
    permiso.menu = {
      check_balance: true,
      points: true,
      redeem_coupon: true,
      report_transaction: true,
      transaction: true,
      purse: true,
      reg_edit_account: false,
      accounts: true,
      load_transactions: true,
      load_accounts: true,
      mailing: false
    }
  }else if(profile === 'comercio' || profile === 'mercadotecnia' || profile === 'operaciones' || profile === 'dir_general'){
    permiso.eliminaTransaccion = true
    permiso.muestraSucursal = true
    permiso.menu = {
      check_balance: true,
      points: true,
      redeem_coupon: true,
      report_transaction: true,
      transaction: true,
      purse: true,
      reg_edit_account: false,
      accounts: true,
      load_transactions: true,
      load_accounts: true,
      mailing: true
    }
  }
  return permiso
}
routes.post('/token', async(req, res, next) => {
  console.log('Request a login/token')
  try{
    //obtenemos el acceso a partir del header
    let datosAcceso = auth(req)
    if(req.headers.authorization === undefined){
      let returnObject = {
        error: true,
        message: "Datos de acceso incorrectos"
      }
      return res.status(400).send(returnObject)
    }
    // vemos si el usuario y la contraseña son válidos:
    let accesoValido = await User.searchUser({usuario: datosAcceso.name, pass: datosAcceso.pass})
    if(accesoValido.length === 0){
      let returnObject = {
        error: true,
        message: "Datos de acceso incorrectos, verifica que el usuario o la contraseña sean correctos"
      }
      return res.status(400).send(returnObject)
    }else{
      // si es una cuenta de cliente le denegamos el acceso: 
      if(accesoValido[0].id_usuario_rol === 5){
        let returnObject = {
          error: true,
          message: "No tienes acceso a estas opciones"
        }
        return res.status(400).send(returnObject)
      }else{
        // vemos que el usuario tenga permiso de accesar:
        if(accesoValido[0].bloqueado === 0 && accesoValido[0].eliminado === 0 && accesoValido[0].activo === 1){
          if(accesoValido[0].id_usuario_rol === 12 || accesoValido[0].id_usuario_rol === 14 || accesoValido[0].id_usuario_rol === 2 || accesoValido[0].id_usuario_rol === 3){
            // admin, super_admin, super_admin_consulta, super_admin_consultab
            let returnObject = {
              error: true,
              message: `Aun no podemos ofrecerte acceso por este medio puedes ingresar desde ${config.liga}`
            }
            console.log('Intento, ingresar: ', accesoValido[0].id_usuario)
            return res.status(400).send(returnObject)
          }else{
            // Vemos a que comercio pertenecen:
            let infoMerchant = await buscaMerchantUsuario(accesoValido[0].id_usuario)
            console.log('Estamos viendo al usuario: ', accesoValido[0].id_usuario)
            if(infoMerchant.length === 0){
              let returnObject = {
                error: true,
                message: 'No tienes un comercio afiliado, comunicate con el administrador'
              }
              return res.status(400).send(returnObject)
            }else{
              // vemos si la licencia aún es válida:
              let validaLicencia = await License.licenciaValida(infoMerchant[0].id_comercio)
              if(validaLicencia[0].estatus === 1){
                //creamos el token:
                let tokenCreado = await Login.createToken({id_usuario: accesoValido[0].id_usuario})
                let infoProfile = await UserProfile.searchUserProfile({id_usuario_rol: accesoValido[0].id_usuario_rol})

                let returnObject = {
                  error: false,
                  token: tokenCreado,
                  user:{
                    user: accesoValido[0].usuario,
                    name: accesoValido[0].nombre,
                    lastname: accesoValido[0].apellidos,
                    email: accesoValido[0].email,
                    profile: infoProfile[0].nombre,
                    search_button: infoMerchant[0].boton_buscar === 0 ? false : true,
                    access: userMenu(infoProfile[0].nombre)
                  }
                }
                if(accesoValido[0].id_usuario_rol === 6 || accesoValido[0].id_usuario_rol === 15 || accesoValido[0].id_usuario_rol === 16 || accesoValido[0].id_usuario_rol === 17){
                  // comercio, mercadotecnia, operaciones, dir_general
                  let detailMerchant = await Merchant.searchMerchant({id_comercio: infoMerchant[0].id_comercio})
                  returnObject.user.merchant = detailMerchant[0].nombre
                  returnObject.user.office = 0
                }else{
                  let detailMerchant = await Office.searchOfficeMerchant('', infoMerchant[0].id_comercio, infoMerchant[0].id_sucursal)
                  if(detailMerchant[0].sucursal_activa === 0){
                    let returnObject = {
                      error: true,
                      message: 'Sucursal inactiva.'
                    }
                    return res.status(400).send(returnObject)
                  }
                  returnObject.user.merchant = detailMerchant[0].comercio
                  returnObject.user.office = detailMerchant[0].sucursal
                }

                return res.status(200).send(returnObject)
              }else{
                let returnObject = {
                  error: true,
                  message: 'Licencia expirada'
                }
                return res.status(400).send(returnObject)
              }
            }
          }
        }else{
          let returnObject = {
            error: true,
            message: 'No tienes acceso a la plataforma, Acceso Denegado.'
          }
          return res.status(400).send(returnObject)
        }
      }
    }
  }catch(err){
    return next(err)
  }
})

module.exports = routes