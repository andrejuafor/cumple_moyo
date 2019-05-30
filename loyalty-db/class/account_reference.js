'use strict'

const mysql = require('../lib/db')

module.exports = class groupAccountReference {
  searchAccountReference(data){
    let search = []
    if(data.id_cuenta_ref) search.push(` id_cuenta_ref = ${data.id_cuenta_ref}`)
    if(data.id_comercio) search.push(` id_comercio = ${data.id_comercio}`)
    if(data.cuenta) search.push(` cuenta = '${data.cuenta}'`)
    if(data.fecha) search.push(` DATE(fecha) = '${data.fecha}'`)
    if(data.niveles) search.push(` niveles = ${data.niveles}`)
    if(data.beneficio_compra) search.push(` beneficio_compra = ${data.beneficio_compra}`)
    if(data.periodo_inicio) search.push(` DATE(periodo_inicio) = '${data.periodo_inicio}'`)
    if(data.periodo_fin) search.push(` DATE(periodo_fin) = '${data.periodo_fin}'`)

    let conn = search.join(' AND ')
    let sql = `SELECT * FROM cuenta_ref ${conn !== '' ? ` WHERE ${conn}` : ''}`
    return mysql.query(sql)
  }
  searchReferenceRange(data){
    return mysql.query(`SELECT * FROM referencia_rango 
                        WHERE id_cuenta_ref = ${data.id_cuenta_ref} 
                        AND inicio <= ${data.monto}
                        AND fin >= ${data.monto}`)
  }
}