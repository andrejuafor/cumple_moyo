'use strict'

const mysql = require('../lib/db')

module.exports = class groupCuponCond {
  searchCuponCond(data) {
    let search = []
    if(data.id_cupon_cond !== undefined) search.push(` id_cupon_cond = ${data.id_cupon_cond}`)
    if(data.id_cupon !== undefined) search.push(` id_cupon = ${data.id_cupon}`)
    if(data.var !== undefined) search.push(` var = '${data.var}'`)
    let conn = search.join(' AND  ')
    return mysql.query(`SELECT * FROM cupon_cond ${conn !== '' ? ` WHERE ${conn}` : ''}`)
  }
}