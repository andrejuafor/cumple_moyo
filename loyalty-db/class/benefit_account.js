'use strict'

const mysql = require('../lib/db')

module.exports = class groupBenefitAccount {
  searchBenefitAccount(data){
    let search = []
    if(data.id_beneficio_cuenta !== undefined) search.push(` id_beneficio_cuenta = ${data.id_beneficio_cuenta}`)
    if(data.id_beneficio !== undefined) search.push(` id_beneficio = ${data.id_beneficio}`)
    if(data.cuenta !== undefined) search.push(` cuenta = '${data.cuenta}'`)
    
    let conn = search.join(' AND ')
    return mysql.query(`SELECT * FROM beneficio_cuenta ${conn !== '' ? ` WHERE ${conn}` : ''}`)
  
  }
  benefitAccountDirectly(beneficio, cuenta){
    return mysql.query(`SELECT * FROM beneficio_cuenta 
                        WHERE id_beneficio = ${beneficio} 
                        AND (cuenta = ${cuenta} OR ${Number(cuenta)} BETWEEN cuentas_desde AND cuentas_hasta)`)
  }
}