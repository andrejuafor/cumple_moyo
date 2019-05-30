'use strict'

const mysql = require('../lib/db')

module.exports = class groupMailingTo {
  searchMailingTo(data, total = false){
    let search = []
    let paginacion = ''
    let orden = ''

    if(data.id_mailing !== undefined && data.id_mailing !== '') search.push(`id_mailing = ${data.id_mailing}`)
    if(data.name !== undefined && data.name !== '') search.push(`nombre like '%${data.name}%'`)
    if(data.account !== undefined && data.account !== '') search.push(`cuenta = '${data.account}'`)
    if(data.email !== undefined && data.email !== '') search.push(`email = '${data.email}'`)
    // if(data.id_comercio !== undefined && data.id_comercio !== '') search.push(`id_comercio = ${data.send_date}`)

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
                FROM mailing_to
                ${conn !== '' ? ` WHERE ${conn}` : '' }
              ;`
    }else{
      sql = `SELECT a.email, a.nombre, a.cuenta, a.enviado, DATE_FORMAT(a.fecha_envio, "%Y-%m-%d %H:%i") AS fecha_envio, b.codigo
              FROM mailing_to a LEFT JOIN cupon_serie b ON a.id_cupon_serie = b.id_cupon_serie
              ${conn !== '' ? ` WHERE ${conn}` : '' }
              ${orden}
              ${paginacion};`      
    }
    return mysql.query(sql)

  }
  
  totalAccountsMailingTo(id_mailing){
    let sql = `SELECT COUNT(cuenta) AS total
                FROM mailing_to 
                WHERE id_mailing = ${id_mailing} 
                AND cuenta IS NOT NULL AND cuenta <> '';`
    return mysql.query(sql)
  }

  deleteMailingTo(data){
    let options = []
    if(data.email !== undefined && data.email !== '') options.push(` email = '${data.email}'`)
    if(data.cuenta !== undefined && data.cuenta !== '') options.push(` cuenta = '${data.cuenta}'`)
    if(data.id !== undefined && data.id !== '') options.push(` id_mailing_to = '${data.id_mailing_to}'`)
    
    let conn = options.join(' AND ')
    let sql = `DELETE FROM mailing_to WHERE id_mailing = ${data.id_mailing} ${conn !== '' ? `${conn}` : '' }`
    return mysql.query(sql)
  }

  insertAllAccounts(id_mailing, id_comercio){
    let sql = `INSERT INTO mailing_to
                SELECT null, ${id_mailing}, email, nombre, numero AS cuenta, 0 ,null,null
                FROM cuenta
                WHERE numero in (
                          SELECT DISTINCT(numero) AS numero
                          FROM sucursal_cuenta
                          WHERE id_sucursal IN (SELECT id_sucursal FROM sucursal WHERE id_comercio = ${id_comercio})
                        )
                AND email IS NOT NULL AND email <> ''
                AND numero NOT IN (SELECT cuenta AS numero FROM mailing_to WHERE id_mailing = ${id_mailing} AND cuenta IS NOT NULL);`
    return mysql.query(sql)
  }

  insertOfficeAccounts(id_mailing, sucursales){
    let sql = `INSERT INTO mailing_to
                SELECT null, ${id_mailing}, email, nombre, numero AS cuenta, 0 ,null,null
                FROM cuenta
                WHERE numero in (
                          SELECT DISTINCT(numero) AS numero
                          FROM sucursal_cuenta
                          WHERE id_sucursal IN (${sucursales.join(',')})
                        )
                AND email IS NOT NULL AND email <> ''
                AND numero NOT IN (SELECT cuenta AS numero FROM mailing_to WHERE id_mailing = ${id_mailing} AND cuenta IS NOT NULL);`
    return mysql.query(sql)
  }

  insertSingleMailingTo(data){
    let sql = `INSERT INTO mailing_to VALUES(null, ${data.id_mailing}, '${data.email}', '${data.nombre}', '${data.cuenta}', 0, null, null);`
    return mysql.query(sql)
  }

  insertAccountsMailingTo(cuentas, id_mailing, id_comercio){
    let sql = `INSERT INTO mailing_to
                SELECT null, ${id_mailing}, a.email, a.nombre, a.numero AS cuenta, 0, null, null
                FROM cuenta a
                WHERE a.numero IN (SELECT DISTINCT(numero) 
                                    FROM sucursal_cuenta 
                                    WHERE id_sucursal IN (SELECT id_sucursal FROM sucursal WHERE id_comercio = ${id_comercio})
                                    AND numero IN (${cuentas})
                                    )
                AND a.email IS NOT NULL AND a.email != ''
                AND numero NOT IN (SELECT cuenta AS numero FROM mailing_to WHERE id_mailing = ${id_mailing} AND cuenta IS NOT NULL);`
    return mysql.query(sql)
  }

  validateMailingTo(cuentaMail, mailing){
    let sql = `SELECT id_mailing_to, email, cuenta FROM mailing_to WHERE id_mailing = ${mailing} AND (cuenta = '${cuentaMail}' OR email = '${cuentaMail}');`
    return mysql.query(sql)
  }

  removeEmailListaNegra(id_mailing){
    let sql = `DELETE FROM mailing_to WHERE id_mailing = ${id_mailing} 
                AND email IN (SELECT email FROM lista_negra WHERE email IS NOT NULL AND email <> '');`
    return mysql.query(sql)
  }

  removeAccountListaNegra(id_mailing){
    let sql = `DELETE FROM mailing_to WHERE id_mailing = ${id_mailing} 
                AND cuenta in (SELECT cuenta FROM lista_negra WHERE cuenta IS NOT NULL AND cuenta <> '');`
    return mysql.query(sql)
  }

}