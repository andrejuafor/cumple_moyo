'use strict'

const mysql = require('../lib/db')

module.exports = class groupUserProfile{
  searchUserProfile(data){
    let search = []
    if(data.id_usuario_rol !== undefined) search.push(`id_usuario_rol = ${data.id_usuario_rol}`)
    if(data.nombre !== undefined) search.push(`nombre = '${data.nombre}'`)
    if(data.descripcion !== undefined) search.push(`descripcion = '${data.descripcion}'`)
    let conn = search.join(' AND ')
    return mysql.query(`SELECT * FROM usuario_rol ${(conn !== '') ? ` WHERE ${conn}` : ''}`)
  }
}