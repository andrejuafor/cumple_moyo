'use strict'

const mysql = require('../lib/db')

module.exports = class groupReports {
  reportAccount(data){
    let search = []
    let paginacion = ''
    let busqueda_comercio = ''
    let rango = ''
    let having = []
    // Añadimos la busqueda por sucursal
    if(data.id_sucursal !== undefined && data.id_sucursal > 0){
      if(Array.isArray() === false){
        if(data.id_sucursal !== '' && data.id_sucursal > 0){
          busqueda_comercio = `id_sucursal = ${data.id_sucursal}`
        }
      }else{
        busqueda_comercio = `id_sucursal IN (${data.id_sucursal.join(',')})`
      }
    }
    if(busqueda_comercio === ''){
      busqueda_comercio = `id_sucursal IN (SELECT id_sucursal FROM sucursal WHERE id_comercio = ${data.id_comercio})`
    }
    // agregamos las condicionales sencillas:
    if(data.account !== undefined && data.account !== '') search.push(` numero = '${data.account}'`)
    if(data.name !== undefined && data.name !== '') search.push(` nombre LIKE '%${data.name}%'`)
    if(data.lastname !== undefined && data.lastname !== '') search.push(` apellidos LIKE '%${data.lastname}%'`)
    if(data.email !== undefined && data.email !== '') search.push(` email LIKE '%${data.email}%'`)
    if(data.cel !== undefined && data.cel !== '') search.push(` cel LIKE '%${data.cel}%'`)
    if(data.zip_code !== undefined && data.zip_code !== '') search.push(` codigo_postal = '${data.zip_code}'`)
    if(data.geneder !== undefined && data.geneder !== '') search.push(` sexo = '${data.geneder}'`)
    if(data.member_date !== undefined && data.member_date !== '') search.push(` DATE(fecha_registro) >= '${data.member_date}'`)
    if(data.day_birthday !== undefined && data.day_birthday !== '') search.push(` fecha_nac_dia = ${data.day_birthday}`)
    if(data.month_birthday !== undefined && data.month_birthday !== '') search.push(` fecha_nac_mes = ${data.month_birthday}`)
    if(data.year_birthday !== undefined && data.year_birthday !== '') search.push(` fecha_nac_ano = ${data.year_birthday}`)
    
    // Agregamos los Having:
    if(data.total_consumption !== undefined && data.total_consumption !== '') having.push(` total_consumido >= '${data.total_consumption}'`)
    if(data.total_consumption_up !== undefined && data.total_consumption_up !== '') having.push(` total_consumido <= '${data.total_consumption_up}'`)
    if(data.average_monthly_consumption_since !== undefined && data.average_monthly_consumption_since !== '') having.push(` consumo_promedio_mensual >= '${data.average_monthly_consumption_since}'`)
    if(data.average_monthly_consumption_up !== undefined && data.average_monthly_consumption_up !== '') having.push(` consumo_promedio_mensual <= '${data.average_monthly_consumption_up}'`)
    if(data.last_month_consumption_since !== undefined && data.last_month_consumption_since !== '') having.push(` consumo_ultimo_mes >= '${data.last_month_consumption_since}'`)
    if(data.last_month_consumption_up !== undefined && data.last_month_consumption_up !== '') having.push(` consumo_ultimo_mes <= '${data.last_month_consumption_up}'`)
    if(data.month_consumption_since !== undefined && data.month_consumption_since !== '') having.push(` consumo_mes >= '${data.month_consumption_since}'`)
    if(data.month_consumption_up !== undefined && data.month_consumption_up !== '') having.push(` consumo_mes <= '${data.month_consumption_up}'`)
    if(data.average_consumption_visit_since !== undefined && data.average_consumption_visit_since !== '') having.push(` consumo_promedio_visita >= '${data.average_consumption_visit_since}'`)
    if(data.average_consumption_visit_up !== undefined && data.average_consumption_visit_up !== '') having.push(` consumo_promedio_visita <= '${data.average_consumption_visit_up}'`)
    if(data.average_spending_visit_since !== undefined && data.average_spending_visit_since !== '') having.push(` gasto_promedio_visita >= '${data.average_spending_visit_since}'`)
    if(data.average_spending_visit_up !== undefined && data.average_spending_visit_up !== '') having.push(` gasto_promedio_visita <= '${data.average_spending_visit_up}'`)
    if(data.average_monthly_visit_since !== undefined && data.average_monthly_visit_since !== '') having.push(` visitas_promedio_mensual >= '${data.average_monthly_visit_since}'`)
    if(data.average_monthly_visit_up !== undefined && data.average_monthly_visit_up !== '') having.push(` visitas_promedio_mensual <= '${data.average_monthly_visit_up}'`)
    if(data.visits_since !== undefined && data.visits_since !== '') having.push(` total_visitas <= ${data.visits_since}`)
    if(data.visits_up !== undefined && data.visits_since !== ''){
      if(data.visits_up === 1 && data.visits_since !== 1){
        having.push(` total_visitas >= 0`)
      }else{
        having.push(` total_visitas >= ${data.visits_up}`)
      }
    }
    if(data.visits_ma_since !== undefined && data.visits_ma_since !== '') having.push(` total_visitas_ma <= '${data.visits_ma_since}'`)
    if(data.visits_ma_up !== undefined && data.visits_ma_up !== '') having.push(` total_visitas_ma >= '${data.visits_ma_up}'`)
    if(data.age_since !== undefined && data.age_since !== ''){
      if(data.age_since === 'ND'){
        having.push(` edad = YEAR(NOW())`)
      }else{
        having.push(` edad >= ${data.age_since} AND edad <> YEAR(NOW())`)
      }
    }
    if(data.age_up !== undefined && data.age_up !== ''){
      if(data.age_up === 'ND'){
        having.push(` edad = YEAR(NOW())`)
      }else{
        having.push(` edad <= ${data.age_up} AND edad <> YEAR(NOW())`)
      }
    }
    
    // agregamos los rangos de fecha para transacciones
    let ultimo_mes = `DATE_SUB(now(), INTERVAL 1 MONTH)`
    if(data.range_transaction !== undefined && data.range_transaction.length === 2){
      if(data.range_transaction[0] !== ''){
        rango += ` AND CAST(fecha as date) <= '${data.range_transaction[0]}'`
      }
      if(data.range_transaction[1] !== ''){
        rango += ` AND CAST(fecha as date) <= '${data.range_transaction[1]}'`
        ultimo_mes = `DATE_SUB('${data.range_transaction[1]}', INTERVAL 1 MONTH)`
      }
    }

    // Agregamos la paginacion:
    if(data.page_ini !== undefined && data.page_end !== undefined){
      if(data.page_ini !== '' && data.page_end !== ''){
        paginacion = ` LIMIT ${data.page_ini}, ${data.page_end}`
      }
    }
    if(data.export_file === true){
      paginacion = ''
    }

    let conn = search.join(' AND ')
    let havingVar = having.join(' AND ')
    let sql = `SELECT numero, nombre, apellidos,
                (SELECT CASE WHEN COUNT(id_cuenta_congelada) > 0 THEN 2 ELSE 1 END FROM cuentas_congeladas WHERE cuenta = cuentas.numero) as id_estatus_cuenta,
                sexo, fecha_nac_dia, fecha_nac_mes, fecha_nac_ano, email,cel, codigo_postal,
                DATEDIFF(now(),ultimo_consumo) as ultimo_consum,
                campo_abierto, total_consumo as total_consumido,
                DATE(fecha_registro) as desde,
                meses / 12 as anios, (YEAR(now()) - IFNULL(fecha_nac_ano, 0)) as edad,
                total_consumo / IF(meses <= 1, 1, meses) as consumo_promedio_mensual,
                (
                  SELECT SUM(transaccion.total) 
                  FROM transaccion INNER JOIN transaccion_detalle USING(id_transaccion) 
                  WHERE transaccion.cuenta = cuentas.numero 
                  AND MONTH(transaccion.fecha) = MONTH(${ultimo_mes}) 
                  AND YEAR(transaccion.fecha) = YEAR(${ultimo_mes}) 
                  AND transaccion_detalle.id_punto > 0 
                  AND ${busqueda_comercio}
                  AND transaccion.id_transaccion NOT IN (SELECT id_transaccion FROM transaccion_del)
                ) as consumo_ultimo_mes,
                (
                  SELECT SUM(transaccion.total) 
                  FROM transaccion INNER JOIN transaccion_detalle USING(id_transaccion) 
                  WHERE transaccion.cuenta = cuentas.numero 
                  AND MONTH(transaccion.fecha) = MONTH(now()) 
                  AND YEAR(transaccion.fecha) = YEAR(${ultimo_mes}) 
                  AND transaccion_detalle.id_punto > 0 
                  AND ${busqueda_comercio}
                  AND transaccion.id_transaccion NOT IN (SELECT id_transaccion FROM transaccion_del)
                ) as consumo_mes,
                (
                  SELECT AVG(transaccion.total) 
                  FROM transaccion INNER JOIN transaccion_detalle USING(id_transaccion) 
                  WHERE transaccion.cuenta = cuentas.numero 
                  AND transaccion_detalle.id_punto > 0 
                  AND transaccion.total > 0 
                  AND ${busqueda_comercio}
                  AND transaccion.id_transaccion NOT IN (SELECT id_transaccion FROM transaccion_del)
                ) as consumo_promedio_visita,
                (
                  SELECT AVG(transaccion.total) 
                  FROM transaccion INNER JOIN transaccion_detalle USING(id_transaccion) 
                  WHERE transaccion.cuenta = cuentas.numero 
                  AND MONTH(transaccion.fecha) = MONTH(${ultimo_mes}) 
                  AND YEAR(transaccion.fecha) = YEAR(${ultimo_mes}) 
                  AND transaccion_detalle.id_punto > 0 
                  AND transaccion.total > 0 
                  AND ${busqueda_comercio}
                  AND transaccion.id_transaccion NOT IN (SELECT id_transaccion FROM transaccion_del)
                ) as ticket_promedio_anterior,
                (
                  SELECT AVG(transaccion.total) 
                  FROM transaccion INNER JOIN transaccion_detalle USING(id_transaccion) 
                  WHERE transaccion.cuenta = cuentas.numero 
                  AND transaccion_detalle.id_punto < 0 
                  ${rango}
                  AND ${busqueda_comercio}
                  AND transaccion.id_transaccion NOT IN (SELECT id_transaccion FROM transaccion_del)
                ) as gasto_promedio_visita,
                (
                  SELECT AVG(transaccion.total) 
                  FROM transaccion INNER JOIN transaccion_detalle USING(id_transaccion) 
                  WHERE cuenta = cuentas.numero 
                  AND MONTH(transaccion.fecha) = MONTH(${ultimo_mes}) 
                  AND YEAR(transaccion.fecha) = YEAR(${ultimo_mes}) 
                  AND transaccion_detalle.id_punto < 0 
                  ${rango}
                  AND ${busqueda_comercio}
                  AND transaccion.id_transaccion NOT IN (SELECT id_transaccion FROM transaccion_del)
                ) as gasto_promedio_visita_anterior,
                total_visitas / IF(meses <= 1, 1, meses) as visitas_promedio_mensual,
                total_visitas,
                total_visitas_ma,
                (SELECT registro_web FROM cuenta WHERE cuenta.numero = cuentas.numero limit 1) AS registro_web,
                (SELECT nombre FROM comercio 
                  WHERE id_comercio IN (SELECT id_comercio_registro FROM cuenta WHERE cuenta.numero = cuentas.numero) limit 1) AS comercio_registro,
                (SELECT cuenta_validada FROM cuenta WHERE cuenta.numero = cuentas.numero limit 1) AS cuenta_validada
              FROM (
                  SELECT *,
                    (DATEDIFF(now(),fecha_registro) / 30.41) as meses,
                    (
                      SELECT SUM(transaccion.total) 
                      FROM transaccion INNER JOIN transaccion_detalle USING(id_transaccion) 
                      WHERE transaccion.cuenta = sucursal_cuenta.numero 
                      AND transaccion_detalle.id_punto > 0 
                      AND ${busqueda_comercio}
                      AND transaccion.id_transaccion NOT IN (SELECT id_transaccion FROM transaccion_del) 
                      ${rango}
                    ) as total_consumo,
                    (
                      SELECT MAX(transaccion.fecha) 
                      FROM transaccion INNER JOIN transaccion_detalle USING(id_transaccion) 
                      WHERE transaccion.cuenta = sucursal_cuenta.numero 
                      AND transaccion_detalle.id_punto > 0 
                      AND transaccion.total > 0 
                      AND ${busqueda_comercio}
                      AND transaccion.id_transaccion NOT IN (SELECT id_transaccion FROM transaccion_del)
                    ) as ultimo_consumo,
                    (
                      SELECT COUNT(transaccion.id_transaccion) 
                      FROM transaccion INNER JOIN transaccion_detalle USING(id_transaccion) 
                      WHERE transaccion.cuenta = sucursal_cuenta.numero 
                      AND ${busqueda_comercio}
                      AND transaccion.id_transaccion NOT IN (SELECT id_transaccion FROM transaccion_del) 
                      AND transaccion_detalle.id_punto > 0 
                      AND transaccion.total > 0 
                      ${rango}
                    ) as total_visitas,
                    (
                      SELECT COUNT(transaccion.id_transaccion) 
                      FROM transaccion INNER JOIN transaccion_detalle USING(id_transaccion) 
                      WHERE transaccion.cuenta = sucursal_cuenta.numero 
                      AND ${busqueda_comercio}
                      AND transaccion.id_transaccion NOT IN (SELECT id_transaccion FROM transaccion_del) 
                      AND transaccion.total > 0 
                      AND MONTH(transaccion.fecha) = MONTH(now()) 
                      AND YEAR(transaccion.fecha) = YEAR(now())
                    ) as total_visitas_ma
                  FROM sucursal_cuenta
                  WHERE ${busqueda_comercio}
                  ${conn}
                  GROUP BY numero 
                  ORDER BY numero ASC
                  ${paginacion}
                ) cuentas
                ${havingVar}
              `
    return mysql.query(sql)
  }

}