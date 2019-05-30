'use strict'

const mysql = require('../lib/db')

module.exports = class groupTransactionDetail {
  createTransactionDetail(data){
    let sql = `INSERT INTO transaccion_detalle (id_transaccion, id_punto, concepto, referencia, puntos, porcentaje, vigencia, total, id_cupon_serie)
                    VALUES(${data.id_transaccion}, ${data.id_punto}, '${data.concepto}', '${data.referencia}', 
                      ${data.puntos}, ${data.porcentaje}, 
                      ${(data.vigencia === null || data.vigencia === '' || data.vigencia === '0000-00-00 00:00') ? null : `'${data.vigencia}'` }, 
                      ${data.total}, ${data.id_cupon_serie})`
    console.log(sql)
    return mysql.query(sql)
  }
  searchTransactionDetailReference(id_transaccion){
    let sql = `SELECT id_transaccion_detalle, id_transaccion, total, DATE_FORMAT(vigencia, "%Y-%m-%d") as vigencia, porcentaje, puntos
                FROM transaccion_detalle WHERE id_transaccion = ${id_transaccion} ORDER BY id_transaccion_detalle ASC LIMIT 1`;
    return mysql.query(sql)
  }
  detailTransactionDetail(transaction_id) {
    return mysql.query(`SELECT (CASE WHEN a.id_punto IS NULL THEN 'AUTOMATICO' ELSE b.nombre END) AS categoria, 
                        a.concepto, a.referencia AS beneficio, FORMAT(a.puntos, 2) AS puntos, 
                        FORMAT((a.porcentaje * 100), 2) AS porcentaje,
                        (CASE WHEN a.puntos < 0 THEN 'N/A'
                              ELSE (CASE WHEN a.vigencia IS NULL THEN 'SIN VIGENCIA' 
                                        WHEN a.vigencia = '0000-00-00 00:00:00' THEN 'SIN VIGENCIA'
                                        ELSE DATE_FORMAT(a.vigencia, "%Y-%m-%d") END) 
                              END) AS vigencia, FORMAT(a.total, 2) AS total
                        FROM transaccion_detalle a LEFT JOIN punto b ON a.id_punto = b.id_punto
                        WHERE a.id_transaccion = ${transaction_id}`)
  }
  couponsTransactionDetail(transaction_id) {
    return mysql.query(`SELECT DISTINCT(id_cupon_serie) AS id_cupon_serie FROM transaccion_detalle WHERE id_transaccion = ${transaction_id}`)
  }
  searchTransactionDetail(data) {
    let search = []
    data.id_transaccion_detalle !== undefined ? search.push(` id_transaccion_detalle = ${data.id_transaccion_detalle}`) : ''
    data.id_transaccion !== undefined ? search.push(` id_transaccion = ${data.id_transaccion}`) : ''
    data.id_punto !== undefined ? search.push(` id_punto = ${data.id_punto}`) : ''
    data.id_cupon_serie !== undefined ? search.push(` id_cupon_serie = ${data.id_cupon_serie}`) : ''
    data.concepto !== undefined ? search.push(` concepto = '${data.concepto}'`) : ''
    data.referencia !== undefined ? search.push(` referencia = '${data.referencia}'`) : ''
    data.puntos !== undefined ? search.push(` puntos = ${data.puntos}`) : ''
    data.porcentaje !== undefined ? search.push(` porcentaje = '${data.porcentaje}'`) : ''
    data.vigencia !== undefined ? search.push(` DATE(vigencia) = '${data.vigencia}'`) : ''
    data.total !== undefined ? search.push(` total = ${data.total}`) : ''
    let conn = search.join(' AND ')

    return mysql.query(`SELECT * 
                        FROM transaccion_detalle
                        ${conn !== '' ? ` WHERE ${conn}` : ''}
                        `)

  }
  // Esta busqueda es para el proceso de actualización de saldo:
  buscaSaldosVencidos(fecha = null){
    if(fecha !== null){
      return mysql.query(`SELECT a.cuenta, a.id_sucursal, c.id_comercio, a.id_transaccion, b.id_transaccion_detalle, b.vigencia, a.puntos
                        FROM transaccion a INNER JOIN transaccion_detalle b USING(id_transaccion)
                          INNER JOIN sucursal c ON a.id_sucursal = c.id_sucursal
                        WHERE DATE(b.vigencia) = '${fecha}';`)
    }else{
      return mysql.query(`SELECT a.cuenta, a.id_sucursal, c.id_comercio, a.id_transaccion, b.id_transaccion_detalle, b.vigencia, a.puntos
                        FROM transaccion a INNER JOIN transaccion_detalle b USING(id_transaccion)
                          INNER JOIN sucursal c ON a.id_sucursal = c.id_sucursal
                        WHERE DATE(b.vigencia) = DATE_ADD(CURDATE(), INTERVAL -1 DAY);`)
    }
  }
}