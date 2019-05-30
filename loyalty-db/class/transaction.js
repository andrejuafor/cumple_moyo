'use strict'

const mysql = require('../lib/db')
const fs = require('fs')

module.exports = class groupTransaction {
  createTransaction(data) {
    let sql = `INSERT INTO transaccion (id_usuario, id_sucursal, inner_id, cuenta, puntos, 
                      referencia, concepto, total, fecha 
                      ${data.cuenta_amigo !== undefined ? `, cuenta_amigo` : ''})
                VALUES (${data.id_usuario}, ${data.id_sucursal}, null, '${data.cuenta}', ${data.puntos}, 
                '${data.referencia}', '${data.concepto}', ${data.total}, now()
                ${data.cuenta_amigo !== undefined ? `, '${data.cuenta_amigo}'` : ''})`
    console.log(sql)
    return mysql.query(sql)
  }
  updateTransaction(data) {
    let update = []
    if(data.id_usuario !== undefined) update.push(` id_usuario = ${data.id_usuario}`)
    if(data.id_sucursal !== undefined) update.push(` id_sucursal = ${data.id_sucursal}`)
    if(data.cuenta !== undefined) update.push(` cuenta = '${data.cuenta}'`)
    if(data.referencia !== undefined) update.push(` referencia = '${data.referencia}'`)
    if(data.concepto !== undefined) update.push(` concepto = '${data.concepto}'`)
    if(data.total !== undefined) update.push(` total = ${data.total}`)
    if(data.puntos !== undefined) update.push(` puntos = ${data.puntos}`)
    if(data.fecha !== undefined) update.push(` fecha = '${data.fecha}'`)

    let conn = update.join(' , ')
    return mysql.query(`UPDATE transaccion SET ${conn} WHERE id_transaccion = ${data.id_transaccion}`)

  }
  detailTransaction(transaction_id) {
    let sql = `SELECT a.id_transaccion, b.nombre AS sucursal, c.nombre AS comercio,
                    a.cuenta, FORMAT(a.puntos, 2) AS puntos, a.referencia, a.concepto, FORMAT(a.total, 2) AS total, 
                    DATE_FORMAT(a.fecha, "%Y-%m-%d %H:%i") AS fecha_transaccion, a.cuenta_amigo, 
                    (CASE WHEN a.id_usuario IS NULL THEN operador ELSE (CASE WHEN d.id_usuario IS NULL THEN a.id_usuario ELSE CONCAT(d.nombre) END) END) AS usuario,
                    (CASE WHEN a.id_usuario IS NULL THEN (CASE WHEN a.operador IS NULL THEN 'SISTEMA' ELSE 'OPERADOR' END)
                          WHEN a.id_usuario = '' THEN (CASE WHEN a.operador IS NULL THEN 'SISTEMA' ELSE 'OPERADOR' END)
                          ELSE 'USUARIO LR' END) AS tipo,
                    IF((SELECT COUNT(id_transaccion) FROM transaccion_del WHERE transaccion_del.id_transaccion = a.id_transaccion) = 1, 'Inactiva', 'Activa') AS status
                FROM transaccion a INNER JOIN sucursal b ON a.id_sucursal = b.id_sucursal
                INNER JOIN comercio c ON b.id_comercio = c.id_comercio
                LEFT JOIN usuario d ON a.id_usuario = d.id_usuario
                WHERE a.id_transaccion = ${transaction_id};`
    return mysql.query(sql)
  }

  searchTransactionSimple(data, total = false){
    let busqueda = []
    let paginacion = ''
    let orden = '';
    if(data.id_transaccion !== undefined) busqueda.push(` id_transaccion LIKE '%${data.id_transaccion}%'`)
    if(data.id_usuario !== undefined) busqueda.push(` id_usuario = ${data.id_usuario}`)

    if(data.id_sucursal !== undefined) busqueda.push(` id_sucursal = ${data.id_sucursal}`)
    if(data.id_comercio !== undefined) busqueda.push(` id_sucursal IN (SELECT id_sucursal FROM sucursal WHERE id_comercio = ${data.id_comercio})`)
    
    if(data.puntos !== undefined) busqueda.push(` puntos = '${data.puntos}'`)
    if(data.total !== undefined) busqueda.push(` total = '${data.total}'`)
    if(data.cuenta !== undefined) busqueda.push(` cuenta LIKE '%${data.cuenta}%'`)
    if(data.fecha !== undefined) busqueda.push(` DATE(fecha) = '${data.fecha}'`)
    if(data.operador !== undefined) busqueda.push(` operador LIKE '%${data.operador}%'`)
    if(data.cupon_generado !== undefined) busqueda.push(` cupon_generado = '${data.cupon_generado}'`)
    if(data.cuenta_amigo !== undefined) busqueda.push(` cuenta_amigo = '${data.cuenta_amigo}'`)
    if(data.referencia !== undefined) busqueda.push(` referencia LIKE '%${data.referencia}%'`)
    if(data.fecha_desde !== undefined && data.fecha_hasta !== undefined){
      busqueda.push(` DATE(fecha) BETWEEN '${data.fecha_desde}' AND '${data.fecha_hasta}'`)
    }else{
      if(data.fecha_desde !== undefined) busqueda.push(` DATE(fecha) >= '${data.fecha_desde}'`)
      if(data.fecha_hasta !== undefined) busqueda.push(` DATE(fecha) <= '${data.fecha_desde}'`)
    }
    busqueda.push(` id_transaccion NOT IN (SELECT id_transaccion FROM transaccion_del)`)
    
    orden = ` ORDER BY fecha DESC`

    if(data.pagina_ini !== undefined && data.pagina_fin !== undefined){
      if(data.pagina_ini !== '' && data.pagina_fin !== ''){
        paginacion = ` LIMIT ${data.pagina_ini}, ${data.pagina_fin}`
      }
    }
    if(data.export_file === true){
      paginacion = ''
    }
    
    let conn = busqueda.join(' AND ')
    let sql = ''
    if(total === true){
      sql = `SELECT COUNT(id_transaccion) AS total
              FROM transaccion 
              ${(conn !== '') ? ` WHERE ${conn} ` : ''}`
    }else{
      sql = `SELECT id_transaccion, id_usuario, id_sucursal, cuenta,
                  FORMAT(puntos, 2) AS puntos, referencia, concepto, FORMAT(total, 2) AS total,
                  DATE_FORMAT(fecha, "%Y-%m-%d %H:%i") AS fecha, id_transaccion_ref, cupon_generado,
                  operador, cuenta_amigo,
                  IF((SELECT COUNT(id_transaccion) FROM transaccion_del WHERE transaccion_del.id_transaccion = transaccion.id_transaccion) = 1, 0, 1) AS status
              FROM transaccion 
              ${(conn !== '') ? ` WHERE ${conn} ` : ''}
              ${orden}
              ${paginacion}`
    }
    return mysql.query(sql)
  }

  searchTransactionSimpleCsv(data){
    let busqueda = []
    let orden = '';
    if(data.id_transaccion !== undefined) busqueda.push(` a.id_transaccion LIKE '%${data.id_transaccion}%'`)
    if(data.id_usuario !== undefined) busqueda.push(` a.id_usuario = '${data.id_usuario}'`)

    if(data.id_sucursal !== undefined) busqueda.push(` a.id_sucursal = '${data.id_sucursal}'`)
    if(data.id_comercio !== undefined) busqueda.push(` a.id_sucursal IN (SELECT id_sucursal FROM sucursal WHERE id_comercio = '${data.id_comercio})'`)
    
    if(data.puntos !== undefined) busqueda.push(` a.puntos = '${data.puntos}'`)
    if(data.total !== undefined) busqueda.push(` a.total = '${data.total}'`)
    if(data.cuenta !== undefined) busqueda.push(` a.cuenta LIKE '%${data.cuenta}%'`)
    if(data.fecha !== undefined) busqueda.push(` a.DATE(fecha) = '${data.fecha}'`)
    if(data.operador !== undefined) busqueda.push(` a.operador LIKE '%${data.operador}%'`)
    if(data.cupon_generado !== undefined) busqueda.push(` a.cupon_generado = '${data.cupon_generado}'`)
    if(data.cuenta_amigo !== undefined) busqueda.push(` a.cuenta_amigo = '${data.cuenta_amigo}'`)
    if(data.referencia !== undefined) busqueda.push(` a.referencia LIKE '%${data.referencia}%'`)
    if(data.fecha_desde !== undefined && data.fecha_hasta !== undefined){
      busqueda.push(` DATE(a.fecha) BETWEEN '${data.fecha_desde}' AND '${data.fecha_hasta}'`)
    }else{
      if(data.fecha_desde !== undefined) busqueda.push(` DATE(a.fecha) >= '${data.fecha_desde}'`)
      if(data.fecha_hasta !== undefined) busqueda.push(` DATE(a.fecha) <= '${data.fecha_desde}'`)
    }

    orden = ` ORDER BY a.fecha DESC`
    
    let conn = busqueda.join(' AND ')
    let sql = `SELECT a.id_transaccion, b.nombre AS sucursal, a.cuenta, a.referencia, a.concepto, 
                    DATE_FORMAT(a.fecha, "%Y-%m-%d %H:%i") AS fecha,
                    (CASE WHEN a.id_usuario IS NULL THEN operador ELSE (CASE WHEN c.id_usuario IS NULL THEN a.id_usuario ELSE CONCAT(c.nombre, ' ', c.apellidos) END) END) AS operador,
                    (CASE WHEN d.id_punto IS NULL THEN 'Pago con puntos' ELSE e.nombre END) AS categoria,
                    (CASE WHEN a.puntos < 0 THEN 'N/A'
                          ELSE (CASE WHEN d.vigencia IS NULL THEN 'SIN VIGENCIA' 
                              WHEN d.vigencia = '0000-00-00 00:00:00' THEN 'SIN VIGENCIA'
                              ELSE DATE_FORMAT(d.vigencia, "%Y-%m-%d") END) 
                          END) AS vigencia,
                    d.total, d.puntos, d.referencia AS referenciaDetalle, 
                    (SELECT CONCAT(cupon.nombre,' ; ',cupon_serie.codigo) FROM transaccion_detalle LEFT JOIN cupon_serie USING(id_cupon_serie) LEFT JOIN cupon USING(id_cupon) WHERE id_transaccion = a.id_transaccion LIMIT 1) as cupon,
                    (CASE WHEN (SELECT COUNT(id_transaccion) FROM transaccion_del WHERE id_transaccion = a.id_transaccion) = 0 THEN '' ELSE 'SI' END ) AS invalido
              FROM transaccion a INNER JOIN sucursal b ON a.id_sucursal = b.id_sucursal
                LEFT JOIN usuario c ON a.id_usuario = c.id_usuario
                INNER JOIN transaccion_detalle d ON a.id_transaccion = d.id_transaccion 
                LEFT JOIN punto e ON d.id_punto = e.id_punto
              ${(conn !== '') ? ` WHERE ${conn} ` : ''}
              ${orden}`
    return mysql.query(sql)
  }

  numTransactionAccount(data){
    let busqueda = []
    if(data.id_transaccion !== undefined) busqueda.push(` id_transaccion = ${data.id_transaccion}`)
    if(data.id_usuario !== undefined) busqueda.push(` id_usuario = '${data.id_usuario}'`)
    if(data.id_sucursal !== undefined) busqueda.push(` id_sucursal = '${data.id_sucursal}'`)
    if(data.id_comercio !== undefined) busqueda.push(` id_sucursal IN (SELECT id_sucursal FROM sucursal WHERE id_comercio = ${data.id_comercio})`)
    if(data.cuenta !== undefined) busqueda.push(` cuenta = '${data.cuenta}'`)
    if(data.fecha !== undefined) busqueda.push(` DATE(fecha) = '${data.fecha}'`)
    if(data.operador !== undefined) busqueda.push(` operador = '${data.operador}'`)
    if(data.cupon_generado !== undefined) busqueda.push(` cupon_generado = '${data.cupon_generado}'`)
    if(data.cuenta_amigo !== undefined) busqueda.push(` cuenta_amigo = '${data.cuenta_amigo}'`)

    busqueda.push(` id_transaccion NOT IN (SELECT id_transaccion FROM transaccion_del)`)

    let conn = busqueda.join(' AND ')
    return mysql.query(`SELECT COUNT(id_transaccion) AS total, cuenta
                        FROM transaccion 
                        ${(conn !== '') ? ` WHERE ${conn} ` : ''}
                        GROUP BY cuenta`)
  }
  
  searchTransaction(data) {
    let busqueda = []
    if(data.id_transaccion !== undefined) busqueda.push(` a.id_transaccion = ${data.id_transaccion}`)
    if(data.id_usuario !== undefined) busqueda.push(` a.id_usuario = '${data.id_usuario}'`)
    if(data.id_sucursal !== undefined) busqueda.push(` a.id_sucursal = '${data.id_sucursal}'`)
    if(data.id_comercio !== undefined) busqueda.push(` b.id_comercio = '${data.id_comercio}'`)
    if(data.cuenta !== undefined) busqueda.push(` a.cuenta = '${data.cuenta}'`)
    if(data.fecha !== undefined) busqueda.push(` DATE(a.fecha) = '${data.fecha}'`)
    if(data.operador !== undefined) busqueda.push(` a.operador = '${data.operador}'`)
    if(data.cuenta_amigo !== undefined) busqueda.push(` a.cuenta_amigo = '${data.cuenta_amigo}'`)
    if(data.cupon_generado !== undefined) busqueda.push(` a.cupon_generado = '${data.cupon_generado}'`)
    
    busqueda.push(` a.id_transaccion NOT IN (SELECT id_transaccion FROM transaccion_del)`)

    let conn = busqueda.join(' AND ')
    return mysql.query(`SELECT a.id_transaccion, b.nombre AS sucursal, c.nombre AS comercio,
                            a.cuenta, a.puntos, a.referencia, a.concepto, a.total, a.fecha AS fecha_transaccion, a.cuenta_amigo, 
                            (CASE WHEN a.id_usuario IS NULL THEN (CASE WHEN a.operador IS NULL THEN 'SISTEMA' ELSE a.operador END)
                                  WHEN a.id_usuario = '' THEN (CASE WHEN a.operador IS NULL THEN 'SISTEMA' ELSE a.operador END)
                                  ELSE a.id_usuario END) AS usuario,
                            (CASE WHEN a.id_usuario IS NULL THEN (CASE WHEN a.operador IS NULL THEN 'SISTEMA' ELSE 'OPERADOR' END)
                                  WHEN a.id_usuario = '' THEN (CASE WHEN a.operador IS NULL THEN 'SISTEMA' ELSE 'OPERADOR' END)
                                  ELSE 'USUARIO LR' END) AS tipo
                        FROM transaccion a INNER JOIN sucursal b ON a.id_sucursal = b.id_sucursal
                            INNER JOIN comercio c ON b.id_comercio = c.id_comercio
                        ${(conn !== '') ? ` WHERE ${conn} ` : ''}`)

  }
  searchTransactionComplete(data){
    let busqueda = []
    if(data.id_transaccion !== undefined) busqueda.push(` a.id_transaccion = ${data.id_transaccion}`)
    if(data.id_usuario !== undefined) busqueda.push(` a.id_usuario = '${data.id_usuario}'`)
    if(data.id_sucursal !== undefined) busqueda.push(` a.id_sucursal = '${data.id_sucursal}'`)
    if(data.cuenta !== undefined) busqueda.push(` a.cuenta = '${data.cuenta}'`)
    if(data.fecha !== undefined) busqueda.push(` DATE(a.fecha) = '${data.fecha}'`)
    if(data.vigencia !== undefined) busqueda.push(` DATE(b.vigencia) = '${data.vigencia}'`)
    if(data.operador !== undefined) busqueda.push(` a.operador = '${data.operador}'`)
    if(data.cuenta_amigo !== undefined) busqueda.push(` a.cuenta_amigo = '${data.cuenta_amigo}'`)
    if(data.cupon_generado !== undefined) busqueda.push(` a.cupon_generado = '${data.cupon_generado}'`)
    if(data.cupon_generado !== undefined) busqueda.push(` a.cupon_generado = '${data.cupon_generado}'`)
    if(data.id_cupon_serie !== undefined) busqueda.push(` b.id_cupon_serie = ${data.id_cupon_serie}`)
    if(data.id_transaccion_detalle !== undefined) busqueda.push(` b.id_transaccion_detalle = ${data.id_transaccion_detalle}`)
    if(data.id_punto !== undefined) busqueda.push(` b.id_punto = ${data.id_punto}`)
    if(data.porcentaje !== undefined) busqueda.push(` b.porcentaje = ${data.porcentaje}`)

    busqueda.push(` a.id_transaccion NOT IN (SELECT id_transaccion FROM transaccion_del)`)

    let conn = busqueda.join(' AND ')
    return mysql.query(`SELECT a.id_transaccion, a.id_usuario, a.id_sucursal, a.cuenta,
                              a.puntos, a.referencia, a.concepto, a.total,
                              a.fecha, a.vigencia, a.id_transaccion_ref, a.cupon_generado,
                              a.operador, a.cuenta_amigo, b.id_transaccion_detalle, b.id_cupon_serie, b.id_punto
                        FROM transaccion a INNER JOIN transaccion_detalle b USING(id_transaccion)
                        ${(conn !== '') ? ` WHERE ${conn} ` : ''}`)
  }

  // Transacciones de pago con puntos
  transactionsPaymentPoints(cuenta, fecha, id_comercio){
    let sql = `SELECT a.id_transaccion, a.id_usuario, a.id_sucursal, a.cuenta, a.puntos, a.total, DATE_FORMAT(DATE(a.fecha), '%Y-%m-%d') as fecha
                FROM transaccion a INNER JOIN sucursal b USING(id_sucursal)
                WHERE a.cuenta = '${cuenta}'
                AND a.puntos < 0 
                AND DATE(a.fecha) <= ${(fecha === '') ? `CURDATE()` : `'${fecha}'` } 
                AND b.id_comercio = ${id_comercio}
                AND a.id_transaccion NOT IN (SELECT id_transaccion FROM transaccion_del);`
    return mysql.query(sql)
  }
  // Transacciones vencidas despues del pago con puntos
  transactionCalculatePoints(cuenta, id_comercio, vigencia){
    let sql = `SELECT a.cuenta, a.id_transaccion, b.puntos, b.id_transaccion_detalle, IFNULL(DATE(b.vigencia), '3000-01-01') AS vig
                FROM transaccion a INNER JOIN transaccion_detalle b USING(id_transaccion)
                      INNER JOIN sucursal c ON a.id_sucursal = c.id_sucursal
                WHERE a.cuenta = '${cuenta}' AND c.id_comercio = ${id_comercio}
                AND (DATE(b.vigencia) >= '${vigencia}' OR b.vigencia IS NULL OR b.vigencia = '0000-00-00 00:00')
                AND DATE(a.fecha) <= '${vigencia}'
                AND b.puntos > 0 
                AND a.id_transaccion NOT IN (SELECT id_transaccion FROM transaccion_del)
                ORDER BY vig, b.id_transaccion_detalle ASC;`
    return mysql.query(sql)
  }
  transactionPointsFree(cuenta, vigencia, transacciones_usadas, id_comercio){
    let sql = `SELECT SUM(b.puntos) AS total
                FROM transaccion a INNER JOIN transaccion_detalle b USING(id_transaccion)
                    INNER JOIN sucursal c ON a.id_sucursal = c.id_sucursal
                WHERE a.cuenta = '${cuenta}' and b.puntos > 0 AND DATE(a.fecha) <= ${(vigencia === '') ? `CURDATE()` : `'${vigencia}'`}
                ${(transacciones_usadas.length !== 0) ? 
                  ` AND b.id_transaccion_detalle NOT IN (${transacciones_usadas.join(',')})` : 
                  ''}
                AND c.id_comercio = ${id_comercio}
                AND (DATE(b.vigencia) >= ${(vigencia === '') ? `CURDATE()` : `'${vigencia}'`} OR b.vigencia IS NULL OR b.vigencia = '0000-00-00 00:00')
                AND a.id_transaccion NOT IN (SELECT id_transaccion FROM transaccion_del);`
    return mysql.query(sql)
  }
  transactionNumberPurchase(cuenta, comercio){
    return mysql.query(`SELECT COUNT(id_transaccion) AS num_compra
                          FROM transaccion a INNER JOIN transaccion_detalle b USING(id_transaccion)
                          WHERE a.id_transaccion  NOT IN (SELECT id_transaccion FROM transaccion_del)
                          AND a.id_sucursal IN (SELECT id_sucursal FROM sucursal WHERE id_comercio = ${comercio})
                          AND b.id_punto > 0 AND a.cuenta = '${cuenta}';`)
  }
  searchTransactionByAmmount(cuenta, comercio, fecha){
    return mysql.query(`SELECT SUM(total) AS total
                        FROM transaccion
                        WHERE id_sucursal IN (SELECT id_sucursal FROM comercio WHERE id_comercio = ${comercio})
                        AND cuenta = '${cuenta}'
                        AND DATE(fecha) > '${fecha}'
                        AND DATEDIFF(NOW(),fecha) < ${fecha}
                        AND total > 0 AND puntos > 0;`)
  }
}