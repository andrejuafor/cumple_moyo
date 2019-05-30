'use strict'

const mysql = require('../lib/db')

module.exports = class groupAntiFraud {
  searchAntiFraud(data){
    let search = []
    if(data.id_anti_fraude !== undefined) search.push(` id_anti_fraude = ${data.id_anti_fraude}`)
    if(data.id_comercio !== undefined) search.push(` id_comercio = ${data.id_comercio}`)
    let conn = search.join(' AND ')
    return mysql.query(`SELECT * FROM anti_fraude ${conn !== '' ? `WHERE ${conn}` : ''}`)
  }
  amountsTransaction(id_comercio){
    return mysql.query(`SELECT (CASE WHEN max_oper IS NULL then 0 WHEN max_oper = '' THEN 0 ELSE max_oper END) AS max_oper,
                              (CASE WHEN max_gs IS NULL then 0 WHEN max_gs = '' THEN 0 ELSE max_gs END) AS max_gs
                        FROM anti_fraude WHERE id_comercio = ${id_comercio}`)
  }
}