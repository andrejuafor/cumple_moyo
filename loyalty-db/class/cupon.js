'use strict'

const mysql = require('../lib/db')

module.exports = class groupCupon {
  searchById(cupon, comercio){
    return mysql.query(`SELECT id_cupon, id_comercio, nombre, condicion, puntos, 
                                DATE_FORMAT(vigencia, '%Y-%m-%d') AS vigencia, 
                                tipo_retorno, fecha_creado, concepto, upload_file, generico, unico_cuenta, 
                        (CASE WHEN DATE(vigencia) = '0000-00-00' THEN '1' 
                              ELSE IF(DATE(vigencia) > curdate(), '1', '0') END) as vig,
                        (CASE WHEN tipo_retorno = 'punto_fijo' THEN CAST(puntos AS CHAR) 
                              WHEN tipo_retorno = 'porcentaje_fijo' THEN CONCAT(puntos, ' ', '%') 
                              WHEN tipo_retorno = 'sumar' THEN CONCAT(puntos, ' ', '%') 
                              WHEN tipo_retorno = 'multiplicar' THEN CAST(puntos AS CHAR)
                              ELSE '' END) AS valor_retorno,
                        (CASE WHEN tipo_retorno = 'punto_fijo' THEN 'puntos' 
                              WHEN tipo_retorno = 'porcentaje_fijo' THEN 'en puntos' 
                              WHEN tipo_retorno = 'sumar' THEN 'en puntos adicionales' 
                              WHEN tipo_retorno = 'multiplicar' THEN 'multiplica tu porcentaje'
                              WHEN tipo_retorno = 'informativo' THEN 'informativo'
                              ELSE '' END) AS nom_retorno
                        FROM cupon 
                        WHERE id_cupon = ${cupon} ${comercio !== '' ? ` AND id_comercio = ${comercio}` : ''}`)
  }
  searchCupon(cupon, comercio){
    return mysql.query(`SELECT id_cupon, id_comercio, nombre, condicion, puntos, 
                                DATE_FORMAT(vigencia, '%Y-%m-%d') AS vigencia, 
                                tipo_retorno, fecha_creado, concepto, upload_file, generico, unico_cuenta, 
                        (CASE WHEN DATE(vigencia) = '0000-00-00' THEN '1' 
                              ELSE IF(DATE(vigencia) > curdate(), '1', '0') END) as vig,
                        (CASE WHEN tipo_retorno = 'punto_fijo' THEN CAST(puntos AS CHAR) 
                              WHEN tipo_retorno = 'porcentaje_fijo' THEN CONCAT(puntos, ' ', '%') 
                              WHEN tipo_retorno = 'sumar' THEN CONCAT(puntos, ' ', '%') 
                              WHEN tipo_retorno = 'multiplicar' THEN CAST(puntos AS CHAR)
                              ELSE '' END) AS valor_retorno,
                        (CASE WHEN tipo_retorno = 'punto_fijo' THEN 'puntos' 
                              WHEN tipo_retorno = 'porcentaje_fijo' THEN 'en puntos' 
                              WHEN tipo_retorno = 'sumar' THEN 'en puntos adicionales' 
                              WHEN tipo_retorno = 'multiplicar' THEN 'multiplica tu porcentaje'
                              WHEN tipo_retorno = 'informativo' THEN 'informativo'
                              ELSE '' END) AS nom_retorno
                        FROM cupon 
                        WHERE id_cupon = ${cupon} ${comercio !== '' ? ` AND id_comercio = ${comercio}` : ''}`)
  }

  searchAcountCupon(comercio, cuenta, validos = true){
      let sql = `SELECT a.serie_id,a.cuenta_id, b.id_cupon, b.codigo, b.assigned, 
                        c.nombre AS cupon, DATE_FORMAT(c.vigencia, "%Y-%m-%d") AS vigencia, 
                        c.tipo_retorno, c.puntos, d.numero AS cuenta,
                        (CASE WHEN tipo_retorno = 'informativo' THEN c.concepto
                              WHEN tipo_retorno = 'punto_fijo' THEN CONCAT(c.puntos,' puntos')
                              WHEN tipo_retorno = 'porcentaje_fijo' THEN CONCAT(c.puntos, '% en puntos')
                              WHEN tipo_retorno = 'sumar' THEN CONCAT(c.puntos, '% en puntos adicionales')
                              WHEN tipo_retorno = 'multiplicar' THEN CONCAT(c.puntos, ' multiplica tu porcentaje')
                              ELSE '' END) AS concepto
                  FROM cuenta_cupon a INNER JOIN cupon_serie b ON a.serie_id = b.id_cupon_serie
                                    INNER JOIN cupon c ON b.id_cupon = c.id_cupon
                                    INNER JOIN sucursal_cuenta d ON a.cuenta_id = d.id_sucursal_cuenta
                  WHERE d.id_sucursal IN (SELECT id_sucursal FROM sucursal WHERE id_comercio = ${comercio})
                  AND b.assigned = 1
                  AND DATE(c.vigencia) >= CURDATE()
                  AND d.numero = '${cuenta}'
                  ${validos === false ? ` AND b.id_cupon_serie NOT IN (SELECT id_cupon_serie FROM transaccion_detalle WHERE id_cupon_serie = b.id_cupon_serie )` : '' };`
      return mysql.query(sql)
  }

}