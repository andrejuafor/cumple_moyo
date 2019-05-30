'use strict'

const mysql = require('../lib/db')

function limpiaCadena(str){
  str = str.toLowerCase()
  str = str.replace(/["']/g, "")
  // remove accents, swap ñ for n, etc
  let from = "àáäâèéëêìíïîòóöôùúüûñç·/_,:;"
  for (let i=0, l=from.length ; i<l ; i++){
    str = str.replace(new RegExp(from.charAt(i), 'g'), '')
  }
  return str;
}

module.exports = class groupOfficeAccount {
  searchOfficAccount(data){
    let search = []
    data.id_sucursal_cuenta !== undefined ? search.push(` a.id_sucursal_cuenta = ${data.id_sucursal_cuenta}`) : ''
    data.id_sucursal !== undefined ? search.push(` a.id_sucursal = ${data.id_sucursal}`) : ''
    data.id_comercio !== undefined ? search.push(` b.id_comercio = ${data.id_comercio}`) : ''
    data.cuenta !== undefined ? search.push(` a.numero = '${data.cuenta}'`) : ''
    data.nombre !== undefined ? search.push(` a.nombre = '${data.nombre}'`) : ''
    data.apellidos !== undefined ? search.push(` a.apellidos = '${data.apellidos}'`) : ''
    data.email !== undefined ? search.push(` a.email = '${data.email}'`) : ''
    data.celular !== undefined ? search.push(` a.cel = '${data.celular}'`) : ''
    data.sexo !== undefined ? search.push(` a.sexo = '${data.sexo}'`) : ''
    data.codigo_postal !== undefined ? search.push(` a.codigo_postal = '${data.codigo_postal}'`) : ''
    data.fecha_reg !== undefined ? search.push(` DATE(a.fecha_registro) = '${data.fecha_reg}'`) : ''
    const conn = search.join(' AND ')
    return mysql.query(`SELECT a.id_sucursal_cuenta, a.id_sucursal, b.id_comercio, 
                            a.numero AS cuenta, a.nombre, a.apellidos, a.email, a.cel, a.codigo_postal, 
                            DATE(a.fecha_registro) AS fecha_registro, sexo
                        FROM sucursal_cuenta a INNER JOIN sucursal b USING(id_sucursal)
                        ${conn !== '' ? ` WHERE ${conn}` : ''}`)
  }
  searchOfficAccountSimple(data){
    let search = []
    data.id_sucursal_cuenta !== undefined ? search.push(` id_sucursal_cuenta = ${data.id_sucursal_cuenta}`) : ''
    data.id_sucursal !== undefined ? search.push(` id_sucursal = ${data.id_sucursal}`) : ''
    data.id_comercio !== undefined ? search.push(` id_sucursal IN (SELECT id_sucursal FROM sucursal WHERE id_comercio = ${data.id_comercio})`) : ''
    data.cuenta !== undefined ? search.push(` numero = '${data.cuenta}'`) : ''
    data.nombre !== undefined ? search.push(` nombre = '${data.nombre}'`) : ''
    data.apellidos !== undefined ? search.push(` apellidos = '${data.apellidos}'`) : ''
    data.email !== undefined ? search.push(` email = '${data.email}'`) : ''
    data.celular !== undefined ? search.push(` cel = '${data.celular}'`) : ''
    data.sexo !== undefined ? search.push(` sexo = '${data.sexo}'`) : ''
    data.codigo_postal !== undefined ? search.push(` codigo_postal = '${data.codigo_postal}'`) : ''
    data.fecha_reg !== undefined ? search.push(` DATE(fecha_registro) = '${data.fecha_reg}'`) : ''
    const conn = search.join(' AND ')
    let sql = `SELECT id_sucursal_cuenta, id_sucursal,
                    numero AS cuenta, nombre, apellidos, email, cel, codigo_postal, 
                    DATE(fecha_registro) AS fecha_registro, sexo,
                    fecha_nac_dia, fecha_nac_mes, fecha_nac_ano
                FROM sucursal_cuenta
                ${conn !== '' ? ` WHERE ${conn}` : ''}`
    return mysql.query(sql)
  }
  dateStartMerchant(data){
    let search = []
    data.id_sucursal !== undefined ? search.push(` a.id_sucursal = ${data.id_sucursal}`) : ''
    data.id_comercio !== undefined ? search.push(` b.id_comercio = ${data.id_comercio}`) : ''
    search.push(`a.numero = '${data.cuenta}'`)
    const conn = search.join(' AND ')
    return mysql.query(`SELECT MIN(DATE(a.fecha_registro)) AS fecha_registro, b.nombre AS sucursal, b.id_comercio
                          FROM sucursal_cuenta a INNER JOIN sucursal b USING(id_sucursal)
                          WHERE ${conn} `)
  }
  createOfficeAccount(data){
    let sql = ''
    if(data.sexo === '' || data.sexo === null || data.sexo === undefined){
      sql = `INSERT INTO sucursal_cuenta (id_sucursal, inner_id, numero, nombre, apellidos, email, 
                      fecha_nac_dia, fecha_nac_mes, fecha_nac_ano, codigo_postal, fecha_registro, 
                      id_logger, cel, campo_abierto)
              VALUES(${data.id_sucursal}, null, '${data.cuenta}', '${data.nombre}', '${data.apellidos}', 
              '${data.email}', ${data.fecha_nac_dia}, ${data.fecha_nac_mes}, ${data.fecha_nac_ano}, 
              '${data.codigo_postal}', NOW(), null, '${data.cel}', '${(data.campo_abierto !== undefined) ? data.campo_abierto : ''}')`
    }else{
      sql = `INSERT INTO sucursal_cuenta (id_sucursal, inner_id, numero, nombre, apellidos, email, 
                        fecha_nac_dia, fecha_nac_mes, fecha_nac_ano, codigo_postal, fecha_registro, 
                        id_logger, cel, sexo, campo_abierto)
                VALUES(${data.id_sucursal}, null, '${data.cuenta}', '${data.nombre}', '${data.apellidos}', 
                '${data.email}', ${data.fecha_nac_dia}, ${data.fecha_nac_mes}, ${data.fecha_nac_ano}, 
                '${data.codigo_postal}', NOW(), null, '${data.cel}', '${data.sexo.toLowerCase()}', '${(data.campo_abierto !== undefined) ? data.campo_abierto : ''}')`
    }
    return mysql.query(sql)
  }
  addOfficeAccount(data){
    return mysql.query(`INSERT INTO sucursal_cuenta (id_sucursal,inner_id, numero, nombre, apellidos, email, fecha_nac_dia, fecha_nac_mes, fecha_nac_ano, 
                                                      codigo_postal, fecha_registro, id_logger, cel, sexo 
                                                      ${data.campo_abierto !== undefined ? `, campo_abierto` : ''})
                        SELECT '${data.id_sucursal}', null, '${data.cuenta}', nombre, apellidos, email, fecha_nac_dia, fecha_nac_mes, fecha_nac_ano, 
                              codigo_postal, NOW(), null, cel, sexo ${data.campo_abierto !== undefined ? `, '${data.campo_abierto}'` : ''}
                        FROM cuenta 
                        WHERE numero = '${data.cuenta}'`)
  }
  updateOfficeAccount(data){
    let update = []
    if(data.nombre !== undefined) update.push(` nombre = ${(data.nombre !== '' && data.nombre !== null) ? `'${data.nombre.replace(/["']/g, "")}'` : `''`}`)
    if(data.apellidos !== undefined) update.push(` apellidos = ${(data.apellidos !== '' && data.apellidos !== null) ? `'${data.apellidos.replace(/["']/g, "")}'` : `''`}`)
    if(data.email !== undefined) update.push(` email = '${data.email}'`)
    if(data.cel !== undefined) update.push(` cel = '${data.cel}'`)
    if(data.codigo_postal !== undefined){
      if(data.codigo_postal !== null && data.codigo_postal.length > 6){
        data.codigo_postal = data.codigo_postal.substr(0,4)
      }
      update.push(` codigo_postal = ${(data.codigo_postal !== '' && data.codigo_postal !== null) ? `'${data.codigo_postal.replace(/["']/g, "")}'` : `''`}`)
    } 
    if(data.sexo !== undefined) update.push(` sexo = ${(data.sexo === 'f' || data.sexo === 'm' || data.sexo === 'w') ? `'${data.sexo}'` : null }`)
    if(data.fecha_nac_dia !== undefined) update.push(` fecha_nac_dia = ${data.fecha_nac_dia}`)
    if(data.fecha_nac_mes !== undefined) update.push(` fecha_nac_mes = ${data.fecha_nac_mes}`)
    if(data.fecha_nac_ano !== undefined) update.push(` fecha_nac_ano = ${data.fecha_nac_ano}`)
    if(data.campo_abierto !== undefined) update.push(` campo_abierto = '${data.campo_abierto}'`)
    
    const conn = update.join(' , ')
    let sql = `UPDATE sucursal_cuenta SET ${conn} WHERE id_sucursal_cuenta = ${data.id_sucursal_cuenta}`
    return mysql.query(sql)
  }
  cuentasSaldoDia(comercio){
    return mysql.query(`SELECT numero 
                        FROM sucursal_cuenta 
                        WHERE id_sucursal IN (SELECT id_sucursal FROM sucursal WHERE id_comercio = ${comercio})
                        AND numero IN (SELECT cuenta AS numero FROM transaccion 
                                                                WHERE id_transaccion NOT IN (SELECT id_transaccion FROM transaccion_del)
                                                                AND id_sucursal IN (SELECT id_sucursal FROM sucursal WHERE id_comercio = ${comercio})
                                      );`)
  }
  deleteOfficeAccount(data){
    return mysql.query(`DELETE FROM sucursal_cuenta WHERE id_sucursal_cuenta = ${data.id_sucursal_cuenta} AND numero = '${data.cuenta}'`)
  }
  
}