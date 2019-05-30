'use strict'

const mysql = require('../lib/db')

/**
 * Tipos de beneficio:
 * codigo_amigo
 * monto_compra
 * primera_compra
 * numero_compra
 */

module.exports = class groupBenefitRegistry {
  searchBenefitTransaction(data){
    let sql = `SELECT nombre, puntos AS puntos, 
                (CASE WHEN vigencia IS NULL THEN ''
                      WHEN vigencia = '' THEN '' 
                      ELSE DATE_FORMAT(DATE_ADD(CURDATE(), INTERVAL vigencia DAY), '%Y-%m-%d') END) AS vigencia, 
                id_cupon, meses_antiguedad, tiempo, monto, 
                  descartar_cuentas, solo_mis_cuentas, reembolso_puntos, no_compra, acumulable, id_comercio
                FROM beneficio_registro
                WHERE tipo_beneficio = '${data.type}' 
                AND activo = 1
                ${ (data.tipo_codigo_amigo !== undefined && data.tipo_codigo_amigo !== '') ? `AND tipo_codigo_amigo = ${data.tipo_codigo_amigo}` : ''} 
                AND puntos = (SELECT MAX(puntos) FROM beneficio_registro WHERE id_comercio = ${data.id_comercio} and tipo_beneficio = '${data.type}' AND activo = 1 GROUP BY id_comercio)
                AND id_comercio = ${data.id_comercio};`
    return mysql.query(sql)
  }
  searchMembership(data){
    return mysql.query(`SELECT nombre, puntos AS puntos, 
                        (CASE WHEN vigencia IS NULL THEN ''
                              WHEN vigencia = '' THEN '' 
                              ELSE DATE_FORMAT(DATE_ADD(CURDATE(), INTERVAL vigencia DAY), '%Y-%m-%d') END) AS vigencia, 
                        id_cupon, meses_antiguedad, tiempo, monto, 
                          descartar_cuentas, solo_mis_cuentas, reembolso_puntos, no_compra, acumulable, id_comercio
                        FROM beneficio_registro
                        WHERE tipo_beneficio = 'afiliacion' AND activo = 1 
                        AND puntos = (SELECT MAX(puntos) FROM beneficio_registro WHERE id_comercio = ${data.id_comercio} and tipo_beneficio = 'afiliacion' AND activo = 1 GROUP BY id_comercio)
                        ${data.beneficio_inicial_cuentas === 0 ? ` AND id_comercio = ${data.id_comercio}` : '' };`)
  }
  searchBirthday(data){
    // Este beneficio solo aplica para el alta de cuentas ya que solo incluye "Dia del mes" y "Fin de mes"
    return mysql.query(`SELECT nombre, puntos, 
                        (CASE WHEN vigencia IS NULL THEN ''
                              WHEN vigencia = '' THEN '' 
                              ELSE DATE_FORMAT(DATE_ADD(CURDATE(), INTERVAL vigencia DAY), '%Y-%m-%d') END) AS vigencia, 
                        id_cupon, dias_cumple, layout_mail, tipo_cumple
                        FROM beneficio_registro
                        WHERE tipo_beneficio = 'cumpleanos' 
                        AND activo = 1 
                        AND tipo_cumple IN (1,3)
                        AND id_comercio = ${data.comercio}`)
  }
  
}