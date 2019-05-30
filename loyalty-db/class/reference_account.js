'use strict'

const mysql =  require('../lib/db')

module.exports = class groupReferenceAccount {
  createReferenceAccount(data){
    return mysql.query(`INSERT INTO referencia_cuenta(id_cuenta, cuenta, id_cuenta_ref) 
                          VALUES(${data.id_cuenta},'${data.cuenta}',${data.id_cuenta_ref});`)
  }
  searchReferenceAccount(data){
    let search = []
    if(data.id_referencia_cuenta) search.push(` id_referencia_cuenta = ${data.id_referencia_cuenta}`)
    if(data.id_cuenta) search.push(` id_cuenta = ${data.id_cuenta}`)
    if(data.cuenta) search.push(` cuenta = '${data.cuenta}'`)
    if(data.id_cuenta_ref) search.push(` id_cuenta_ref = ${data.id_cuenta_ref}`)

    let conn = search.join(' AND ')
    return mysql.query(`SELECT * FROM referencia_cuenta ${conn !== '' ? ` WHERE ${conn}` : ''}`)
  }
  getLevels(cuenta, id_comercio){
    return mysql.query(`SELECT MAX(b.niveles) AS nivel
                        FROM referencia_cuenta a INNER JOIN cuenta_ref b USING(id_cuenta_ref)
                        WHERE a.cuenta = '${cuenta}'
                        AND b.id_comercio = ${id_comercio}
                        AND ((b.periodo_inicio <= CURDATE() AND b.periodo_fin >= CURDATE()) OR (b.periodo_inicio IS NULL OR b.periodo_fin IS NULL));`)
  }
  accountReference(cuenta, id_comercio){
    return mysql.query(`SELECT b.cuenta, b.retorno 
                          FROM referencia_cuenta a INNER JOIN cuenta_ref b USING(id_cuenta_ref)
                          WHERE b.id_comercio = ${id_comercio}
                          AND a.cuenta = '${cuenta}'
                          AND ((b.periodo_inicio <= CURDATE() AND b.periodo_fin >= CURDATE()) OR (b.periodo_inicio IS NULL OR b.periodo_fin IS NULL))`)
  }

  accountValidate(where, cuenta, id_comercio){
    return mysql.query(`SELECT b.cuenta, b.retorno 
                          FROM referencia_cuenta a INNER JOIN cuenta_ref b USING(id_cuenta_ref)
                          WHERE ${(where !== '') ? `b.cuenta NOT IN (${where}) AND` : ''} a.cuenta = '${cuenta}'
                          AND b.id_comercio = '${id_comercio}'
                          AND ((b.periodo_inicio <= CURDATE() AND b.periodo_fin >= CURDATE()) OR (b.periodo_inicio IS NULL OR b.periodo_fin IS NULL))`)
  }
}