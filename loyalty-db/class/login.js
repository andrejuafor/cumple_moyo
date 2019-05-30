'use strict'

const mysql = require('../lib/db')
const uuidv4 = require('uuid/v4')
const CryptoJS = require('crypto-js')

module.exports = class groupLogin {
  createToken(data){
    let uuid = uuidv4()
    let token = CryptoJS.SHA256(uuid).toString()
    token = token.substr(0,20)
    mysql.query(`INSERT INTO sesiones_token (token, id_usuario, caducidad)
                          VALUES ('${token}', ${data.id_usuario}, DATE_ADD(NOW(), INTERVAL 2 HOUR))`)
    return token
  }
  searchToken(token){
    return mysql.query(`SELECT id_usuario, (CASE WHEN caducidad < NOW() THEN '0' ELSE '1' END) AS caducidad 
                        FROM sesiones_token WHERE token = '${token}';`)
  }
  deleteTokens(){
    return mysql.query(`DELETE FROM sesiones_token WHERE caducidad < NOW();`)
  }
}

