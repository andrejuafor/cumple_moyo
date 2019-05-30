'use strict'

const mysql = require('../lib/db')

module.exports = class groupLicense {
  searchLicense(data){
    let busqueda = []
    if(data.conditions.fecha_vence !== undefined) busqueda.push(` DATE(fecha_vence) = '${data.conditions.fecha_vence}'`)
    if(data.conditions.sucursales !== undefined) busqueda.push(` DATE(sucursales) = '${data.conditions.sucursales}'`)
    if(data.conditions.id_comercio !== undefined) busqueda.push(` DATE(id_comercio) = ${data.conditions.id_comercio}`)
    if(data.conditions.id_licencia !== undefined) busqueda.push(` DATE(id_licencia) = ${data.conditions.id_licencia}`)

    let conn  = busqueda.join(' AND ')
    return mysql.query(`SELECT id_licencia, id_comercio, DATE(fecha_vence) AS fecha_vence, sucursales 
                        FROM licencia ${(conn !== '') ? ` WHERE ${conn}` : ''}`)
  }
  licenciaValida(id_comercio){
    return mysql.query(`SELECT id_licencia, id_comercio, MAX(DATE(fecha_vence)),
                            (CASE WHEN MAX(DATE(fecha_vence)) < CURDATE() THEN 0 ELSE 1 END) AS estatus
                        FROM licencia WHERE id_comercio = ${id_comercio} GROUP BY id_comercio;`)
  }
}