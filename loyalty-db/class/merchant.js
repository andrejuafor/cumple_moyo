'use strict'

const mysql = require('../lib/db')

module.exports = class groupMerchant {
  searchMerchant(data){
    let search = []
    if(data.id_comercio !== undefined) search.push(` id_comercio = ${data.id_comercio}`)
    if(data.id_usuario !== undefined) search.push(` id_usuario = ${data.id_usuario}`)
    if(data.nombre !== undefined) search.push(` nombre = '${data.nombre}'`)
    if(data.nombre_like !== undefined) search.push(` nombre LIKE '%${data.nombre}%'`)
    if(data.codigo_postal !== undefined) search.push(` codigo_postal = '${data.codigo_postal}'`)
    if(data.estado !== undefined) search.push(` estado = '${data.estado}'`)
    if(data.municipio !== undefined) search.push(` municipio = '${data.municipio}'`)
    if(data.fecha_registro !== undefined) search.push(` DATE(fecha_registro) = '${data.fecha_registro}'`)
    if(data.oculto !== undefined) search.push(` oculto = ${data.oculto}`)
    if(data.orden !== undefined) search.push(` orden = ${data.orden}`)
    if(data.beneficio_inicial_cuentas !== undefined) search.push(` beneficio_inicial_cuentas = ${data.beneficio_inicial_cuentas}`)
    if(data.notifica_transaccion !== undefined) search.push(` notifica_transaccion = ${data.notifica_transaccion}`)
    if(data.notifica_cupones !== undefined) search.push(` notifica_cupones = ${data.notifica_cupones}`)
    if(data.estado_cuenta !== undefined) search.push(` estado_cuenta = ${data.estado_cuenta}`)
    if(data.id_usuario_admin !== undefined) search.push(` id_usuario_admin = ${data.id_usuario_admin}`)
    if(data.boton_buscar !== undefined) search.push(` boton_buscar = ${data.boton_buscar}`)
    if(data.solicitar_clave !== undefined) search.push(` solicitar_clave = ${data.solicitar_clave}`)
    if(data.validacion_mail_cuenta !== undefined) search.push(` validacion_mail_cuenta = ${data.validacion_mail_cuenta}`)
    if(data.registro_completo_cuenta !== undefined) search.push(` registro_completo_cuenta = ${data.registro_completo_cuenta}`)
    if(data.round_puntos !== undefined) search.push(` round_puntos = ${data.round_puntos}`)
    if(data.validacion_registro_operador_completa !== undefined) search.push(` validacion_registro_operador_completa = ${data.validacion_registro_operador_completa}`)
    if(data.t_captura_monedero !== undefined) search.push(` t_captura_monedero = ${data.t_captura_monedero}`)
    if(data.rep_genera_trans_op !== undefined) search.push(` rep_genera_trans_op = ${data.rep_genera_trans_op}`)
    if(data.lun !== undefined) search.push(` lun = ${data.lun}`)
    if(data.mar !== undefined) search.push(` mar = ${data.mar}`)
    if(data.mier !== undefined) search.push(` mier = ${data.mier}`)
    if(data.jue !== undefined) search.push(` jue = ${data.jue}`)
    if(data.vie !== undefined) search.push(` vie = ${data.vie}`)
    if(data.sab !== undefined) search.push(` sab = ${data.sab}`)
    if(data.dom !== undefined) search.push(` dom = ${data.dom}`)

    let conn = search.join(' AND ')
    return mysql.query(`SELECT * FROM comercio ${conn !== '' ? ` WHERE ${conn}` : ''}`)
  }
  workday(comercio){
    return mysql.query(`SELECT lun, mar, mier, jue, vie, sab, dom FROM comercio WHERE id_comercio = ${comercio}`)
  }
  searchMailWelcome(comercio){
    return mysql.query(`SELECT id_comercio, nombre, (CASE WHEN mail_bienvenida IS NULL THEN '' ELSE mail_bienvenida END) as mail_bienvenida 
                        FROM comercio WHERE id_comercio = ${comercio}`)
  }
  littleData(comercio){
    return mysql.query(`SELECT registro_completo_cuenta, validacion_registro_operador_completo 
                        FROM comercio WHERE id_comercio = ${comercio}`)
  }
}