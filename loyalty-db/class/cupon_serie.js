'use strict'

const mysql = require('../lib/db')

module.exports = class groupCuponSerie{
  detailCuponSerie(id_cupon_serie){
    return mysql.query(`SELECT a.codigo, b.nombre, b.puntos, b.tipo_retorno, b.concepto, 
                          (CASE WHEN DATE(b.vigencia) = '0000-00-00' THEN 'Sin vigencia'
                              WHEN DATE(b.vigencia) IS NULL THEN 'Sin vigencia'
                              ELSE DATE(b.vigencia) END
                            ) AS vigencia
                        FROM cupon_serie a INNER JOIN cupon b USING(id_cupon)     
                        WHERE a.id_cupon_serie = ${id_cupon_serie}`)
  }
  searchCuponSerieCupon(data){
    let search = []
    data.id_cupon_serie !== undefined ? search.push(` a.id_cupon_serie = ${data.id_cupon_serie}`) : ''
    data.codigo !== undefined ? search.push(` a.codigo = '${data.codigo}'`) : ''
    data.id_cupon !== undefined ? search.push(` a.id_cupon = '${data.id_cupon}'`) : ''
    data.id_comercio !== undefined ? search.push(` b.id_comercio = ${data.id_comercio}`) : ''
    data.vigencia !== undefined ? search.push(` DATE(b.vigencia) = '${data.vigencia}'`) : ''

    let conn = search.join(' AND ')

    return mysql.query(`SELECT a.id_cupon_serie, a.codigo, b.nombre, b.puntos, b.tipo_retorno,
                          b.id_cupon, b.id_comercio, b.tipo_retorno, b.generico, b.condicion, b.unico_cuenta,
                          (CASE WHEN DATE(b.vigencia) = '0000-00-00' THEN 'Sin vigencia'
                              WHEN DATE(b.vigencia) IS NULL THEN 'Sin vigencia'
                              ELSE DATE(b.vigencia) END) AS vigencia,
                            (CASE WHEN tipo_retorno = 'informativo' THEN b.concepto
                            WHEN tipo_retorno = 'punto_fijo' THEN CONCAT(b.puntos,' puntos')
                                  WHEN tipo_retorno = 'porcentaje_fijo' THEN CONCAT(b.puntos, '% en puntos')
                                  WHEN tipo_retorno = 'sumar' THEN CONCAT(b.puntos, '% en puntos adicionales')
                                  WHEN tipo_retorno = 'multiplicar' THEN CONCAT(b.puntos, ' multiplica tu porcentaje')
                                  ELSE '' END) AS concepto
                        FROM cupon_serie a INNER JOIN cupon b USING(id_cupon)     
                        ${conn !== '' ? ` WHERE ${conn}` : ''}`)
  }
  searchCuponSerie(data){
    let search = []
    data.id_cupon_serie !== undefined ? search.push(` id_cupon_serie = ${data.id_cupon_serie}`) : ''
    data.id_cupon !== undefined ? search.push(` id_cupon = ${data.id_cupon}`) : ''
    data.codigo !== undefined ? search.push(` codigo = '${data.codigo}'`) : ''
    data.assigned !== undefined ? search.push(` assigned = ${data.assigned}`) : ''
    let conn = search.join(' AND ')
    return mysql.query(`SELECT * FROM cupon_serie ${conn !== '' ? ` WHERE ${conn}` : ''}`)
  }

  updateCuponSerie(data){
    let update = []
    data.id_cupon !== undefined ? update.push(` id_cupon = ${data.id_cupon}`) : ''
    data.codigo !== undefined ? update.push(` codigo = '${data.codigo}'`) : ''
    data.assigned !== undefined ? update.push(` assigned = ${data.assigned}`) : ''
    let conn = update.join(' , ')
    return mysql.query(`UPDATE cupons_serie SET ${conn} WHERE id_cupon_serie = ${data.id_cupon_serie}`)
  }

  createCuponSerie(data){
    return mysql.query(`INSERT INTO cupon_serie (id_cupon, codigo, assigned)
                          VALUES(${data.id_cupon}, ${data.codigo}, ${data.assigned})`)
  }

}