'use strict'

const mysql = require('../lib/db')

module.exports = class groupListaNegra {
  searchListaNegra(data){
    let search = []
    if(data.email !== undefined && data.email !== '') search.push(` email = '${data.email}'`)
    if(data.cuenta !== undefined && data.cuenta !== '') search.push(` cuenta = '${data.cuenta}'`)
    if(data.id_comercio !== undefined && data.id_comercio !== '') search.push(` id_comercio = ${data.id_comercio}`)
    
    let conn = search.join(' AND ')
    let sql = `SELECT * FROM lista_negra ${conn !== '' ? `WHERE ${conn}` : '' }`
    return mysql.query(sql)
  }
}