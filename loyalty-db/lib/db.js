'use strict'

const mysql = require('promise-mysql')
const config = require('../config')

// Ponemos los datos de acceso para el server de test
let var_acceso = {
  host: config.db.host,
  user: config.db.user,
  password: config.db.password,
  database: config.db.database,
  connectionLimit: 10,
  acquireTimeout: 1000000
}
let pool = mysql.createPool(var_acceso)

// let pool = mysql.createPool({
//   host: 'localhost',
//   user: 'root',
//   password: 'mysql',
//   database: 'lr_prod',
//   connectionLimit: 10
// })

// pool.getConnection((err, connection) => {
//   if (err) {
//       if (err.code === 'PROTOCOL_CONNECTION_LOST') {
//           console.error('Database connection was closed.')
//       }
//       if (err.code === 'ER_CON_COUNT_ERROR') {
//           console.error('Database has too many connections.')
//       }
//       if (err.code === 'ECONNREFUSED') {
//           console.error('Database connection was refused.')
//       }
//   }
//   if (connection) connection.release()
//   return
// })

module.exports = pool
