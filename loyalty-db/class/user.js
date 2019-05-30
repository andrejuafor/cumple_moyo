'use strict'

const mysql = require('../lib/db')
const SHA256 = require("crypto-js/sha256");
const config = require('../config')

module.exports = class groupUser {
  searchUser(data){
    let busqueda = []
    if(data.id_usuario !== undefined) busqueda.push(` id_usuario = '${data.id_usuario}'`)
    if(data.id_usuario_rol !== undefined) busqueda.push(` id_usuario_rol = '${data.id_usuario_rol}'`)
    if(data.nombre !== undefined) busqueda.push(` nombre = '${data.nombre}'`)
    if(data.apellidos !== undefined) busqueda.push(` apellidos = '${data.apellidos}'`)
    if(data.usuario !== undefined) busqueda.push(` usuario = '${data.usuario}'`)
    if(data.codigo_postal !== undefined) busqueda.push(` codigo_postal = '${data.codigo_postal}'`)
    if(data.pass !== undefined) busqueda.push(` pass = '${data.pass}'`)
    if(data.bloquedado !== undefined) busqueda.push(` bloquedado = '${data.bloquedado}'`)
    if(data.eliminado !== undefined) busqueda.push(` eliminado = '${data.eliminado}'`)
    if(data.activo !== undefined) busqueda.push(` activo = '${data.activo}'`)
    if(data.email !== undefined) busqueda.push(` email = '${data.email}'`)

    let conn = busqueda.join(' AND ')
    return mysql.query(`SELECT id_usuario, id_usuario_rol, usuario, nombre, apellidos, email, codigo_postal,
                              bloqueado, eliminado, activo, date(fecha_creacion) AS fecha_creacion
                        FROM usuario ${(conn !== '' ) ? `WHERE ${conn}` : '' } `)
  }
  searchUserAdmin(data){
    let busqueda = []
    if(data.id_usuario !== undefined) busqueda.push(` id_usuario = '${data.id_usuario}'`)
    if(data.nombre !== undefined) busqueda.push(` nombre = '${data.nombre}'`)
    if(data.apellidos !== undefined) busqueda.push(` apellidos = '${data.apellidos}'`)
    if(data.usuario !== undefined) busqueda.push(` usuario = '${data.usuario}'`)
    if(data.codigo_postal !== undefined) busqueda.push(` codigo_postal = '${data.codigo_postal}'`)
    if(data.pass !== undefined) busqueda.push(` pass = '${data.pass}'`)
    if(data.bloquedado !== undefined) busqueda.push(` bloquedado = '${data.bloquedado}'`)
    if(data.eliminado !== undefined) busqueda.push(` eliminado = '${data.eliminado}'`)
    if(data.activo !== undefined) busqueda.push(` activo = '${data.activo}'`)
    if(data.clave !== undefined) busqueda.push(` clave = '${data.clave}'`)
    if(data.sinClave !== undefined) busqueda.push(` clave IS NULL`)

    let conn = busqueda.join(' AND ')
    return mysql.query(`SELECT * FROM usuario ${(conn !== '' ) ? `WHERE ${conn}` : '' } `)
  }
  createUser(data){
    let pass = SHA256(data.pass)
    return mysql.query(`INSERT INTO usuario (id_usuario_rol, usuario, pass, nombre, apellidos, email, bloqueado, eliminado, fecha_creacion, activo, codigo_postal, new, mail_pref, clave)
                          VALUES(${data.usuario_rol}, '${data.usuario}', '${data.pass}', '${data.nombre}',' ${data.apellidos}', '${data.email}', 
                                  0, 0, NOW(), 1, '${data.codigo_postal}', 1, 1, '${pass}')`)
  }
  merchantOfficeUser(user){
    let sql = `SELECT a.id_comercio, '' AS id_sucursal, boton_buscar
                FROM administrador_comercio a INNER JOIN comercio b USING(id_comercio)
                WHERE a.id_usuario = ${user}
                UNION
                SELECT b.id_comercio, b.id_sucursal, c.boton_buscar
                FROM operador a INNER JOIN sucursal b USING(id_sucursal)
                    INNER JOIN comercio c ON b.id_comercio = c.id_comercio
                WHERE a.id_usuario = ${user}
                UNION
                SELECT id_comercio, '' AS id_sucursal, boton_buscar
                FROM comercio WHERE id_usuario = ${user};`
    return mysql.query(sql)
  }
  merchantAdmin(user){
    let sql = `SELECT a.id_comercio, '' AS id_sucursal, boton_buscar
                FROM administrador_comercio a INNER JOIN comercio b USING(id_comercio)
                WHERE a.id_usuario = ${user}`
    return mysql.query(sql)
  }
  updateUser(data){
    let update = []
    if(data.nombre !== undefined) update.push(` nombre = '${data.nombre}'`)
    if(data.apellidos !== undefined) update.push(` apellidos = '${data.apellidos}'`)
    if(data.email !== undefined) update.push(` email = '${data.email}'`)
    if(data.codigo_postal !== undefined) update.push(` codigo_postal = '${data.codigo_postal}'`)
    if(data.bloquedado !== undefined) update.push(` bloquedado = '${data.bloquedado}'`)
    if(data.eliminado !== undefined) update.push(` eliminado = '${data.eliminado}'`)
    if(data.activo !== undefined) update.push(` activo = '${data.activo}'`)
    if(data.password !== undefined) update.push(` pass = '${data.pass}'`)
    if(data.password !== undefined) update.push(` clave = '${SHA256(data.pass)}'`)
    if(data.clave !== undefined) update.push(` clave = '${data.clave}'`)
    let conn = update.join(' , ')
    return mysql.query(`UPDATE usuario SET ${conn} WHERE id_usuario = '${data.id_usuario}';`)
  }

  validaUsuario(usuario, correo){
    let sql = `SELECT id_usuario, nombre, apellidos, email, codigo_postal FROM usuario WHERE id_usuario_rol = 5 AND (usuario = '${usuario}' OR email = '${correo}')`
    return mysql.query(sql)
  }
}