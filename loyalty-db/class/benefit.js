'use strict'

const mysql = require('../lib/db')

module.exports = class groupBenefit {
  searchBenefit(data){
    let search = []
    if(data.id_beneficio !== undefined) search.push(` id_beneficio = ${data.id_beneficio}`)
    if(data.id_comercio !== undefined) search.push(` id_comercio = ${data.id_comercio}`)
    if(data.nombre !== undefined) search.push(` nombre = '${data.nombre}'`)
    if(data.activo !== undefined) search.push(` activo = ${data.activo}`)
    
    let conn = search.join(' AND ')
    return mysql.query(`SELECT * FROM beneficio ${conn !== '' ? ` WHERE ${conn}` : ''}`)
  }
  benefitsMerchant(comercio, cuenta, monto){
    let sql = `SELECT a.id_beneficio, a.id_comercio, a.nombre, a.descripcion,
                  a.fecha_desde, a.fecha_hasta,
                  (CASE WHEN a.fecha_desde IS NULL THEN 1
                        WHEN a.fecha_desde = '' THEN 1
                        ELSE IF(DATE(a.fecha_desde) > CURDATE(), 1, 0) END  
                  ) AS fecha_desde_valido,
                  (CASE WHEN a.fecha_hasta IS NULL THEN 1
                        WHEN a.fecha_hasta = '' THEN 1
                        ELSE IF(DATE(a.fecha_hasta) < CURDATE(), 1, 0) END  
                  ) AS fecha_hasta_valido,
                  (CASE WHEN a.unidad = 'monto' 
                                  THEN IF(
                                          (SELECT SUM(total) AS total 
                                            FROM transaccion 
                                            WHERE id_sucursal IN (SELECT id_sucursal FROM sucursal WHERE id_comercio = ${comercio})
                                            AND cuenta = '${cuenta}'
                                            AND DATEDIFF(NOW(), fecha < a.tiempo)) >= a.valor, 
                                          1, 0 ) 
                        WHEN a.unidad = 'visita' THEN 0
                        WHEN a.unidad = 'compra'
                                  THEN IF(
                                          (SELECT COUNT(total) AS total 
                                            FROM transaccion 
                                            WHERE id_sucursal IN (SELECT id_sucursal FROM sucursal WHERE id_comercio = ${comercio})
                                            AND cuenta = '${cuenta}'
                                            AND DATEDIFF(NOW(), fecha < a.tiempo)) >= a.valor, 
                                          1, 0 ) 
                        WHEN a.unidad = 'transaccion' THEN (IF( ${monto} <= a.valor , 1, 0))
                  ELSE 0 END
                  ) AS tiene_beneficio,
                  a.valor, a.unidad, a.tiempo, a.porcentaje, a.caracts, a.activo,
                  a.id_cupon, b.nombre AS cupon
              FROM beneficio a INNER JOIN cupon b USING(id_cupon)
              WHERE a.id_comercio = ${comercio}`
    return mysql.query(sql)
  }
  updateBenefit(data){
    let update = []
    if(data.id_comercio !== undefined) update.push(` id_comercio = ${data.id_comercio}`)
    if(data.nombre !== undefined) update.push(` nombre = '${data.nombre}'`)
    if(data.descripcion !== undefined) update.push(` descripcion = '${data.descripcion}'`)
    if(data.fecha_desde !== undefined) update.push(` fecha_desde = '${data.fecha_desde}'`)
    if(data.fecha_hasta !== undefined) update.push(` fecha_hasta = '${data.fecha_hasta}'`)
    if(data.valor !== undefined) update.push(` valor = '${data.valor}'`)
    if(data.unidad !== undefined) update.push(` unidad = '${data.unidad}'`)
    if(data.tiempo !== undefined) update.push(` tiempo = '${data.tiempo}'`)
    if(data.porcentaje !== undefined) update.push(` porcentaje = '${data.porcentaje}'`)
    if(data.caracts !== undefined) update.push(` caracts = '${data.caracts}'`)
    if(data.id_cupon !== undefined) update.push(` id_cupon = '${data.id_cupon}'`)
    if(data.activo !== undefined) update.push(` activo = '${data.activo}'`)

    let conn = update.join(' , ')
    let sql = `UPDATE beneficio SET ${conn} WHERE id_beneficio = ${data.id_beneficio};`
    return mysql.query(sql)
  }


}