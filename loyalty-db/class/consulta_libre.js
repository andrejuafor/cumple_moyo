'use strict'

const mysql = require('../lib/db')

module.exports = class groupConsultaLibre {
  consulta(sql){
    return mysql.query(sql)
  }
} 