'use strict'

var mysql = require('../lib/db')
const uuidv4 = require('uuid/v4')

module.exports = class groupAccount {
  // obtenemos los datos básicos de una cuenta:
  infoAccount(data){
    let sql = `SELECT a.nombre, a.apellidos, a.email, a.numero AS cuenta,
                concat(a.fecha_nac_ano,'-',a.fecha_nac_mes,'-',a.fecha_nac_dia) AS fecha_nacimiento,
                    DATE(a.fecha_registro) AS fecha_registro, a.sexo, a.cel, a.codigo_postal, 
                    a.cuenta_validada, b.clave, b.pass, a.cuenta_amigo
              FROM cuenta a INNER JOIN usuario b USING(id_usuario)
              WHERE b.id_usuario_rol = 5 
              AND (a.email = '${data.account}' OR a.numero = '${data.account}' OR a.cel = '${data.account}');`
    return mysql.query(sql)
  }
  // validamos si existe una cuenta en usuario y cuenta
  validationAccount(data){
    let sql = `SELECT a.nombre, a.apellidos, a.email, a.numero AS cuenta,
                concat(a.fecha_nac_ano,'-',a.fecha_nac_mes,'-',a.fecha_nac_dia) AS fecha_nacimiento,
                    DATE(a.fecha_registro) AS fecha_registro, a.sexo, a.cel, a.codigo_postal, 
                    a.cuenta_validada, b.clave AS pass, a.cuenta_amigo
              FROM cuenta a INNER JOIN usuario b USING(id_usuario)
              WHERE b.id_usuario_rol = 5 
              AND (a.email = '${data.email}' OR a.numero = '${data.cuenta}' OR a.cel = '${data.cel}');`
    return mysql.query(sql)
  }
  // busqueda de una cuenta
  searchAccount(data){
    let busqueda = []
    if(data.id_cuenta !== undefined) busqueda.push(` id_cuenta = '${data.id_cuenta}'`)
    if(data.id_usuario !== undefined) busqueda.push(` id_usuario = '${data.id_usuario}'`)
    if(data.nombre !== undefined) busqueda.push(` nombre = '${data.nombre}'`)
    if(data.apellidos !== undefined) busqueda.push(` apellidos = '${data.apellidos}'`)
    if(data.email !== undefined) busqueda.push(` email = '${data.email}'`)
    if(data.cel !== undefined) busqueda.push(` cel = '${data.cel}'`)
    if(data.codigo_postal !== undefined) busqueda.push(` codigo_postal = '${data.codigo_postal}'`)
    if(data.sexo !== undefined) busqueda.push(` sexo = '${data.sexo}'`)
    if(data.cuenta !== undefined) busqueda.push(` numero = '${data.cuenta}'`)
    if(data.fecha_registro !== undefined) busqueda.push(` DATE(fecha_registro) = '${data.fecha_registro}'`)
    
    let conn = busqueda.join(' AND ')
    let sql = `SELECT nombre, apellidos, id_cuenta, id_usuario, numero AS cuenta, email, cel, codigo_postal, sexo, fecha_nac_dia, fecha_nac_mes, fecha_nac_ano
                FROM cuenta
                ${conn !== '' ? ` WHERE ${conn}` : '' }`
    return mysql.query(sql)
  }
  searchAccountSimple(data, total = false){
    let busqueda = []
    let paginacion = ''
    let orden = ''

    // if(data.id_comercio !== undefined) busqueda.push(` c.id_comercio = ${data.id_comercio}`)
    // if(data.id_sucursal !== undefined) busqueda.push(` b.id_sucursal = ${data.id_sucursal}`)

    if(data.id_sucursal !== undefined){
      busqueda.push(` a.numero IN (SELECT DISTINCT(numero) AS numero FROM sucursal_cuenta WHERE id_sucursal = ${data.id_sucursal})`)
    }else{
      busqueda.push(` a.numero IN (SELECT DISTINCT(numero) AS numero FROM sucursal_cuenta WHERE id_sucursal IN (SELECT id_sucursal FROM sucursal WHERE id_comercio = ${data.id_comercio}))`)
    }

    if(data.nombre !== undefined) busqueda.push(` a.nombre LIKE '%${data.nombre}%'`)
    if(data.apellidos !== undefined) busqueda.push(` a.apellidos LIKE '%${data.apellidos}%'`)
    if(data.email !== undefined) busqueda.push(` a.email LIKE '%${data.email}%'`)
    if(data.cel !== undefined) busqueda.push(` a.cel LIKE '%${data.cel}%'`)
    if(data.codigo_postal !== undefined) busqueda.push(` a.codigo_postal = '${data.codigo_postal}'`)
    if(data.sexo !== undefined) busqueda.push(` a.sexo = '${data.sexo}'`)
    if(data.cuenta !== undefined) busqueda.push(` a.numero LIKE '%${data.cuenta}%'`)
    if(data.edad !== undefined){ 
      busqueda.push(` if(a.fecha_nac_mes > 0,
        (CASE WHEN a.fecha_nac_ano > 0 THEN (CASE WHEN (YEAR(CURDATE()) - a.fecha_nac_ano) <= 0 THEN 0 ELSE if(MONTH(CURDATE()) < a.fecha_nac_mes, (YEAR(CURDATE()) - a.fecha_nac_ano) ,(YEAR(CURDATE()) - a.fecha_nac_ano) - 1) END) ELSE 0 END),
        (CASE WHEN a.fecha_nac_ano > 0 THEN (CASE WHEN (YEAR(CURDATE()) - a.fecha_nac_ano) <= 0 THEN 0 ELSE (YEAR(CURDATE()) - a.fecha_nac_ano) END) ELSE 0 END)
        ) = ${data.edad}`)
    }

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
    if(total === false){
      sql = `SELECT COUNT(a.numero) AS total
                FROM cuenta a
                ${conn !== '' ? ` WHERE ${conn}` : '' }
              ;`
    }else{
      sql = `SELECT a.numero AS cuenta, a.nombre, a.apellidos, a.email, a.cel, a.codigo_postal,
                    a.fecha_nac_dia, a.fecha_nac_mes, a.fecha_nac_ano, 
                    (CASE WHEN a.sexo = '' THEN 'N/A' WHEN a.sexo IS NULL THEN 'N/A' WHEN a.sexo = 'm' THEN 'Hombre' WHEN a.sexo = 'f' THEN 'Mujer' WHEN a.sexo = 'w' THEN 'Monedero' ELSE 'N/A' END) AS sexo,
                    if(a.fecha_nac_mes > 0,
                      (CASE WHEN a.fecha_nac_ano > 0 THEN (CASE WHEN (YEAR(CURDATE()) - a.fecha_nac_ano) <= 0 THEN 0 ELSE if(MONTH(CURDATE()) < a.fecha_nac_mes, (YEAR(CURDATE()) - a.fecha_nac_ano) ,(YEAR(CURDATE()) - a.fecha_nac_ano) - 1) END) ELSE 0 END),
                      (CASE WHEN a.fecha_nac_ano > 0 THEN (CASE WHEN (YEAR(CURDATE()) - a.fecha_nac_ano) <= 0 THEN 0 ELSE (YEAR(CURDATE()) - a.fecha_nac_ano) END) ELSE 0 END)
                      ) AS edad
                FROM cuenta a 
                ${conn !== '' ? ` WHERE ${conn}` : '' }
                ${orden}
                ${paginacion};`
    }
    return mysql.query(sql)
  }
  // crear cuenta:
  createAccount(data){
    let token_validacion = uuidv4()
    console.log('La data del insert: ',data)
    let sql = ''
    if(data.sexo === '' || data.sexo === null || data.sexo === undefined){
      sql = `INSERT INTO cuenta(id_usuario, nombre, apellidos, email, fecha_nac_dia, fecha_nac_mes, codigo_postal, fecha_registro, numero, fecha_nac_ano, 
                    cel, pref_mailing, campo_abierto, cuenta_validada, registro_web, id_comercio_registro, 
                    token_validacion, id_estatus_cuenta, cuenta_amigo)
              VALUES(${data.id_usuario}, '${data.nombre}', '${data.apellidos}', '${data.email}', 
              ${data.fecha_nac_dia}, ${data.fecha_nac_mes}, '${data.codigo_postal}', NOW(), '${data.cuenta}', ${data.fecha_nac_ano}, 
              '${data.cel}', 1, '${(data.campo_abierto !== undefined) ? data.campo_abierto : ''}', 0, 0, 
              ${data.comercio_registro}, '${token_validacion}', 1, ${(data.cuenta_amigo !== undefined) ? `'${data.cuenta_amigo}'` : null} );`
    }else{
      sql = `INSERT INTO cuenta(id_usuario, nombre, apellidos, email, fecha_nac_dia, fecha_nac_mes, codigo_postal, fecha_registro, numero, fecha_nac_ano, sexo, 
                    cel, pref_mailing, campo_abierto, cuenta_validada, registro_web, id_comercio_registro, 
                    token_validacion, id_estatus_cuenta, cuenta_amigo)
              VALUES(${data.id_usuario}, '${data.nombre}', '${data.apellidos}', '${data.email}', 
              ${data.fecha_nac_dia}, ${data.fecha_nac_mes}, '${data.codigo_postal}', NOW(), '${data.cuenta}', ${data.fecha_nac_ano}, 
              '${data.sexo.toLowerCase()}', '${data.cel}', 1, '${(data.campo_abierto !== undefined) ? data.campo_abierto : ''}', 0, 0, 
              ${data.comercio_registro}, '${token_validacion}', 1, ${(data.cuenta_amigo !== undefined) ? `'${data.cuenta_amigo}'` : null} );`
    }
    console.log('Alta de cuenta:', sql)
    return mysql.query(sql)
  }
  updateAccount(data){
    let update = []
    if(data.nombre !== undefined) update.push(` nombre = '${data.nombre}'`)
    if(data.apellidos !== undefined) update.push(` apellidos = '${data.apellidos}'`)
    if(data.email !== undefined) update.push(` email = '${data.email}'`)
    if(data.cel !== undefined) update.push(` cel = '${data.cel}'`)
    if(data.codigo_postal !== undefined) update.push(` codigo_postal = '${data.codigo_postal}'`)
    if(data.sexo !== undefined) update.push(` sexo = '${data.sexo}'`)
    if(data.fecha_nac_dia !== undefined) update.push(` fecha_nac_dia = '${data.fecha_nac_dia}'`)
    if(data.fecha_nac_mes !== undefined) update.push(` fecha_nac_mes = '${data.fecha_nac_mes}'`)
    if(data.fecha_nac_ano !== undefined) update.push(` fecha_nac_ano = '${data.fecha_nac_ano}'`)
    if(data.fecha_nac_ano !== undefined) update.push(` fecha_nac_ano = '${data.fecha_nac_ano}'`)
    if(data.cuenta_amigo !== undefined) update.push(` cuenta_amigo = '${data.cuenta_amigo}'`)

    let conn = update.join(' , ')
    let sql = `UPDATE cuenta SET ${conn} WHERE id_cuenta = ${data.id_cuenta}`
    return mysql.query(sql)
  }
  searchFrozen(data){
    return mysql.query(`SELECT cuenta FROM cuentas_congeladas WHERE cuenta = '${data.cuenta}' AND id_comercio = ${data.id_comercio}`)
  }
  totalAccounts(id_comercio){
    let sql = `SELECT COUNT(DISTINCT(numero)) AS total 
                FROM sucursal_cuenta
                WHERE id_sucursal IN (SELECT id_sucursal FROM sucursal WHERE id_comercio = ${id_comercio})`
    return mysql.query(sql)
  }
  cuentasSinUsuario(){
    let sql = `SELECT * FROM cuenta WHERE id_usuario IS NULL AND fecha_registro IS NOT NULL AND numero IS NOT NULL;`
    return mysql.query(sql)
  }
  actualizaIdUsuario(id_usuario, id_cuenta){
    let sql = `UPDATE cuenta SET id_usuario = ${id_usuario} WHERE id_cuenta = ${id_cuenta}`
    return mysql.query(sql)
  }
  validaCuenta(cuenta, correo, cel){
    let sql = `SELECT id_cuenta, id_usuario, nombre, apellidos, email, cel, codigo_postal FROM cuenta WHERE (numero = '${cuenta}' OR email = '${correo}')`
    return mysql.query(sql)
  }
}