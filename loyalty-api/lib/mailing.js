'use strict'

const {Mailing} = require('loyalty-db')

module.exports = {
  async revisaCuenta(data, cuentaMail, mailing){
    try{
      // vemos si está la cuenta/correo en la tabla
      let validaMailingTo = Mailing.validateMailingTo(cuentaMail, mailing)
      if(validaMailingTo > 0){
        return true
      }else{
        // insertamos el dato:
        
      }
    }catch(err){
      return err
    }
  }
}