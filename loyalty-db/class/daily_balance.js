'use strict'

const mysql = require('../lib/db')

module.exports = class groupDailyBalance {
  insertSaldoDiario(data){
    return mysql.query(`INSERT INTO saldo_dia VALUES(null, ${data.id_comercio},'${data.cuenta}', ${data.saldo})`)
  }
  getSaldoDiario(cuenta, comercio){
    return mysql.query(`SELECT saldo FROM saldo_dia WHERE id_comercio = ${comercio} AND cuenta = '${cuenta}';`)
  }
  updateSaldoDiario(cuenta, comercio, monto){
    return mysql.query(`UPDATE saldo_dia SET saldo = ${monto} WHERE cuenta = '${cuenta}' AND id_comercio = ${comercio}`)
  }
}