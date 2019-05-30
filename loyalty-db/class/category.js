'use strict'

const mysql = require('../lib/db')

module.exports = class groupCategory {
  searchCategory(data){
    let search = []
    if(data.category_id !== undefined) search.push(` id_punto = ${data.category_id}`)
    if(data.id_comercio !== undefined) search.push(` id_comercio = ${data.id_comercio}`)
    if(data.id_sucursal !== undefined) search.push(` id_sucursal = ${data.id_sucursal}`)
    if(data.id_usuario !== undefined) search.push(` id_usuario = ${data.id_usuario}`)
    if(data.lun !== undefined) search.push(` lun = ${data.lun}`)
    if(data.mar !== undefined) search.push(` mar = ${data.mar}`)
    if(data.mier !== undefined) search.push(` mier = ${data.mier}`)
    if(data.jue !== undefined) search.push(` jue = ${data.jue}`)
    if(data.vie !== undefined) search.push(` vie = ${data.vie}`)
    if(data.sab !== undefined) search.push(` sab  = ${data.sab}`)
    if(data.dom !== undefined) search.push(` dom = ${data.dom}`)
    //if(data.active !== undefined) search.push(` activo = ${(data.active === true) ? 1 : 0 }`)

    let conn = search.join(' AND ')
    return mysql.query(`SELECT id_punto AS id_categoria, nombre, porcentaje, vigencia, vigencia_fija, 
                        lun, mar, mier, jue, vie, sab, dom, hora_ini, hora_fin
                        FROM punto ${conn !== '' ? ` WHERE ${conn}` : ''}`)
  }
  activeCategory(data){
    let search = []
    if(data.id_categoria !== undefined) search.push(` id_punto = ${data.id_categoria}`)
    if(data.id_comercio !== undefined && data.id_sucursal !== undefined){
      search.push(` (id_comercio = ${data.id_comercio} OR id_sucursal = ${data.id_sucursal})`)
    }else{
      if(data.id_comercio !== undefined) search.push(` id_comercio = ${data.id_comercio}`)
      if(data.id_sucursal !== undefined) search.push(` id_sucursal = ${data.id_sucursal}`)
    }
    
    if(data.active !== undefined) {
      search.push(` activo = ${(data.active === true) ? 1 : 0 }`)
      if(data.active === true){
        search.push(` (CASE WHEN weekday(curdate()) = 0 THEN if(weekday(curdate())=0,(if(lun=1,1,0)),0)
                          WHEN weekday(curdate()) = 1 THEN if(weekday(curdate())=1,(if(mar=1,1,0)),0)
                          WHEN weekday(curdate()) = 2 THEN if(weekday(curdate())=2,(if(mier=1,1,0)),0)
                          WHEN weekday(curdate()) = 3 THEN if(weekday(curdate())=3,(if(jue=1,1,0)),0)
                          WHEN weekday(curdate()) = 4 THEN if(weekday(curdate())=4,(if(vie=1,1,0)),0)
                          WHEN weekday(curdate()) = 5 THEN if(weekday(curdate())=5,(if(sab=1,1,0)),0)
                          ELSE if(weekday(curdate())=6,(if(dom=1,1,0)),0) END) = 1`)
        search.push(` IF(hora_ini IS NOT NULL, IF(TIME(hora_ini) < TIME(NOW()) AND TIME(hora_fin) > TIME(NOW()) ,1,0), 1)`)
      }
    } 
    let conn = search.join(' AND ')
    let sql = `SELECT id_punto AS id_categoria, id_comercio, id_sucursal, nombre, porcentaje, activo, 
                  (CASE WHEN vigencia IS NULL THEN ''
                  WHEN vigencia = '' THEN '' 
                  ELSE DATE_FORMAT(DATE_ADD(CURDATE(), INTERVAL vigencia DAY), '%Y-%m-%d') END) AS vigencia, 
                  DATE_FORMAT(vigencia_fija, "%Y-%m-%d") AS vigencia_fija,
                (CASE WHEN weekday(curdate()) = 0 THEN if(weekday(curdate())=0,(if(lun=1,1,0)),0)
                  WHEN weekday(curdate()) = 1 THEN if(weekday(curdate())=1,(if(mar=1,1,0)),0)
                  WHEN weekday(curdate()) = 2 THEN if(weekday(curdate())=2,(if(mier=1,1,0)),0)
                  WHEN weekday(curdate()) = 3 THEN if(weekday(curdate())=3,(if(jue=1,1,0)),0)
                  WHEN weekday(curdate()) = 4 THEN if(weekday(curdate())=4,(if(vie=1,1,0)),0)
                  WHEN weekday(curdate()) = 5 THEN if(weekday(curdate())=5,(if(sab=1,1,0)),0)
                  ELSE if(weekday(curdate())=6,(if(dom=1,1,0)),0) END) AS dia_habilitado,
                  TIME(hora_ini), TIME(hora_fin), TIME(NOW()),
                  IF(hora_ini IS NOT NULL, IF(TIME(hora_ini) < TIME(NOW()) AND TIME(hora_fin) > TIME(NOW()) ,1,0), 1) AS horario_habilitado
              FROM punto ${conn !== '' ? ` WHERE ${conn}` : ''};`
    return mysql.query(sql)
  }
}
