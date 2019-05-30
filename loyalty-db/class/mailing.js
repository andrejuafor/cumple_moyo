'use strict'

const mysql = require('../lib/db')

module.exports = class groupMailing {
  searchMailing(data, total = false){
    let search = []
    let paginacion = ''
    let orden = ' ORDER BY fecha_envio DESC'

    if(data.id_mailing !== undefined && data.id_mailing !== '') search.push(`id_mailing = ${data.id_mailing}`)
    if(data.name !== undefined && data.name !== '') search.push(`nombre like '%${data.name}%'`)
    if(data.send_date !== undefined && data.send_date !== '') search.push(`send_date = '${data.send_date}'`)
    if(data.id_comercio !== undefined && data.id_comercio !== '') search.push(`id_comercio = ${data.id_comercio}`)
    let conn = search.join(' AND ')

    if(data.page_ini !== undefined && data.page_end !== undefined){
      if(data.page_ini !== '' && data.page_end !== ''){
        paginacion = ` LIMIT ${data.page_ini}, ${data.page_end}`
      }
    }
    if(data.export_file === true){
      paginacion = ''
    }

    let sql = ''

    if(total === false){
      sql = `SELECT COUNT(id_mailing) AS total
                FROM mailing
                ${conn !== '' ? ` WHERE ${conn}` : '' }
              ;`
    }else{
      sql = `SELECT a.id_mailing, a.nombre, a.hora_envio, observaciones,
                DATE_FORMAT(a.fecha_envio, "%Y-%m-%d") AS fecha_envio,
                (SELECT COUNT(id_mailing) FROM mailing_to WHERE id_mailing = a.id_mailing) AS remitentes
              FROM mailing a
              ${conn !== '' ? ` WHERE ${conn}` : '' }
              ${orden}
              ${paginacion};`    
    }
    return mysql.query(sql)
  }

  searchMailingReport(data){
    let search = []

    if(data.id_mailing !== undefined && data.id_mailing !== '') search.push(`a.id_mailing = ${data.id_mailing}`)
    if(data.name !== undefined && data.name !== '') search.push(`a.nombre like '%${data.name}%'`)
    if(data.send_date !== undefined && data.send_date !== '') search.push(`a.send_date = '${data.send_date}'`)
    if(data.id_comercio !== undefined && data.id_comercio !== '') search.push(`a.id_comercio = ${data.id_comercio}`)
    let conn = search.join(' AND ')

    let sql = `SELECT a.id_mailing, DATE_FORMAT(a.fecha_envio, '%Y-%m-%d') AS fecha_envio, a.hora_envio, a.nombre, a.observaciones, observaciones,
                  a.id_cupon, b.nombre AS nombreCupon,
                  a.enviosLR, a.enviados, a.invalidos, a.abiertos, a.solicitados, a.rechazados, a.abiertosUnicos, a.spam, a. clicks, a.clicksUnicos    
          FROM mailing a LEFT JOIN cupon b ON a.id_cupon = b.id_cupon
              ${conn !== '' ? ` WHERE ${conn}` : '' }
              ORDER BY a.fecha_envio DESC;`
    return mysql.query(sql)
  }

  detailMailing(data){
    let sql = `SELECT a.id_mailing, a.nombre, DATE_FORMAT(a.fecha_envio, "%Y-%m-%d") AS fecha_envio, a.hora_envio, a.titulo, 
                a.mensaje, a.observaciones,
                DATE_FORMAT(a.fecha_creacion, "%Y-%m-%d %H:%i") AS fecha_creacion, a.id_cupon,
                (SELECT COUNT(id_mailing) FROM mailing_to WHERE id_mailing = a.id_mailing) AS remitentes,
                a.enviados, a.invalidos, a.abiertos, a.solicitados, a.rechazados, a.abiertosUnicos, a.spam, a.clicks, a.clicksUnicos
              FROM mailing a
              WHERE id_comercio = ${data.id_comercio} AND id_mailing = ${data.id_mailing};`
    return mysql.query(sql)
  }

  insertMailing(data){
    let sql = ''
    if(data.coupon !== undefined && data.coupon !== ''){
      sql = `INSERT INTO mailing (id_usuario, id_comercio, alias, nombre, fecha_envio, hora_envio, titulo, mensaje, fecha_creacion, observaciones, id_cupon) 
                                  VALUES (${data.id_usuario}, ${data.id_comercio}, '', '${data.name}', '${data.date_send}', '${data.hour_send}', '${data.title}',
                                            '${data.html.replace(/['"]+/g, '"')}', now(), '${data.observations}', ${data.coupon})`
    }else{
      sql = `INSERT INTO mailing (id_usuario, id_comercio, alias, nombre, fecha_envio, hora_envio, titulo, mensaje, fecha_creacion, observaciones) 
                                  VALUES (${data.id_usuario}, ${data.id_comercio}, '', '${data.name}', '${data.date_send}', '${data.hour_send}', '${data.title}',
                                            '${data.html.replace(/['"]+/g, '"')}', now(), '${data.observations}')`
    }
    return mysql.query(sql)
  }

  updateMailing(data){
    let update = []
    if(data.name !== undefined && data.name !== '') update.push(` nombre = '${data.name}'`)
    if(data.date_send !== undefined && data.date_send !== '') update.push(` fecha_envio = '${data.date_send}'`)
    if(data.hour_send !== undefined && data.hour_send !== '') update.push(` hora_envio = '${data.hour_send}'`)
    if(data.title !== undefined && data.title !== '') update.push(` titulo = '${data.title}'`)
    if(data.observations !== undefined && data.observations !== '') update.push(` observaciones = '${data.observations}'`)
    if(data.html !== undefined && data.html !== '') update.push(` mensaje = '${data.html.replace(/['"]+/g, '"')}'`)
    if(data.coupon !== undefined && data.coupon !== '') update.push(` id_cupon = ${data.coupon}`)

    let cond = update.join(' , ')
    let sql = `UPDATE mailing SET ${cond} WHERE id_mailing = ${data.id_mailing}`
    return mysql.query(sql)
  }

  fileMailing(data){
    let sql = `SELECT id_mailing_archivo, CONCAT('https://loyaltyrefunds.com/file/', archivo) AS url, nombre 
              FROM mailing_archivo WHERE id_mailing = ${data.id_mailing}`
    return mysql.query(sql)
  }
}

