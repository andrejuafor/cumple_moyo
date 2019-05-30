'use strict'

const mysql = require('../lib/db')

module.exports = class groupAccountCupon {
  createAccountCupon(data){
    return mysql.query(`INSERT INTO cuenta_cupon (serie_id, cuenta_id, fecha_actualizacion, fecha_creacion)
                          VALUES (${data.serie_id}, ${data.cuenta_id}, NOW(), NOW())`)
  }
}