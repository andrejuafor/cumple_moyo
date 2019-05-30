'use strict'

const mysql = require('../lib/db')

module.exports = class groupOffice{
  searchOffice(data){
    let busqueda = []
    if(data.id_sucursal !== undefined) busqueda.push(` a.id_sucursal = ${data.id_sucursal}`)
    if(data.id_comercio !== undefined) busqueda.push(` a.id_comercio = '${data.id_comercio}'`)
    if(data.nombre !== undefined) busqueda.push(` a.nombre LIKE '%${data.nombre}%'`)
    if(data.nombreExacto !== undefined) busqueda.push(` a.nombre = '${data.nombre}'`)
    if(data.clave !== undefined) busqueda.push(` a.clave = '${data.clave}'`)
    if(data.activo !== undefined) busqueda.push(` a.activo = '${data.activo}'`)
    if(data.api_key !== undefined) busqueda.push(` a.api_key = '${data.api_key}'`)
    
    busqueda.push(` a.del = 0`)
    let orden = ` ORDER BY a.nombre`
    let paginacion = ''

    if(data.pagina_ini !== undefined && data.pagina_fin !== undefined){
      if(data.pagina_ini !== '' && data.pagina_fin !== ''){
        paginacion = ` LIMIT ${data.pagina_ini}, ${data.pagina_fin}`
      }
    }
    if(data.export_file === true){
      paginacion = ''
    }

    let conn = busqueda.join(' AND ')
    let sql = `SELECT a.id_sucursal, a.nombre AS sucursal, b.nombre AS comercio, a.activo, a.api_key 
                FROM sucursal a INNER JOIN comercio b USING(id_comercio)
                ${(conn !== '') ? ` WHERE ${conn}` : ''}
                ${orden}
                ${paginacion}`
    return mysql.query(sql)
  }
  createOffice(data){
    let result = mysql.query(`INSERT INTO sucursal (id_comercio, nombre, clave, activo, api_key, direccion, id_codigo_postal, solicitar_clave)
                                VALUES (${data.id_comercio}, ${data.nombre}, ${data.clave}, 1, 
                                        ${data.apikey}, ${data.direccion}, ${data.codigo_postal},${data.solicitar_clave})`)
    return result.insertId
  }
  searchOfficeMerchant(apikey, id_comercio, id_sucursal){
    let search = []
    apikey !== '' ? search.push(`a.api_key = '${apikey}'`) : ''
    id_sucursal !== '' ? search.push(` a.id_sucursal = ${id_sucursal}`) : ''
    id_comercio !== '' ? search.push(` a.id_comercio = ${id_comercio}`) : ''
    let conn = search.join(' AND ')
    let sql = `SELECT a.id_sucursal, a.id_comercio, a.nombre AS sucursal, a.activo AS sucursal_activa, a.api_key, a.solicitar_clave AS clave_sucursal,
                  b.nombre as comercio, b.punto_x_peso, b.orden, b.notifica_transaccion, b.notifica_cupones, b.boton_buscar, 
                  b.solicitar_clave AS clave_comercio, b.validacion_mail_cuenta, b.registro_completo_cuenta, b.round_puntos, 
                  b.ref_automatico,
                  b.validacion_registro_operador_completo,b.beneficio_inicial_cuentas
                FROM sucursal a INNER JOIN comercio b ON a.id_comercio = b.id_comercio
                ${conn !== '' ? ` WHERE ${conn}` : ''}`
    return mysql.query(sql)
  }
  corporateOffice(id_comercio){
    return mysql.query(`SELECT id_sucursal FROM sucursal WHERE id_comercio = ${id_comercio} AND nombre LIKE '%Corporativo%';`)
  }
  firstOfficeReg(id_comercio){
    return mysql.query(`SELECT MIN(id_sucursal) AS id_sucursal FROM sucursal WHERE id_comercio = ${id_comercio};`)
  }
}