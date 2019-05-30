'use strict'

const mysql = require('../lib/db')

module.exports = class groupPrizeAccount{
  searchPrizeAccount(data){
    let search = []
    if(data.id_premio_cuenta !== undefined) search.push(` id_premio_cuenta = ${data.id_premio_cuenta}`)
    if(data.id_beneficio_registro !== undefined) search.push(` id_beneficio_registro = ${data.id_beneficio_registro}`)
    if(data.cuenta !== undefined) search.push(` cuenta = '${data.cuenta}'`)
    if(data.fecha !== undefined) search.push(` DATE(fecha) = '${data.fecha}'`)

    let conn = search.join(' AND ')
    return mysql.query(`SELECT * FROM premio_cuenta ${conn !== '' ? ` WHERE ${conn}` : ''}`)
  }
  searchPrizeAccountMax(data){
    return mysql.query(`SELECT MAX(fecha) AS fecha FROM premio_cuenta 
                        WHERE cuenta = '${data.cuenta}'
                        AND id_beneficio_registro = ${id_beneficio_registro}`)
  }
  cretePrizeAccount(data){
    return mysql.query(`INSERT INTO premio_cuenta (id_beneficio_registro, cuenta, fecha)
                            VALUES(${data.id_beneficio_registro}, '${data.cuenta}', NOW())`)
  }
}