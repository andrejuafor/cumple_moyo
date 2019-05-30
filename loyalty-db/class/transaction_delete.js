'use strict'

const mysql = require('../lib/db')

module.exports = class groupTransactionDelete {
  deleteTransaction(data){
    return mysql.query(`INSERT INTO transaccion_del VALUES(null, ${data.id_transaccion}, ${data.id_usuario}, now(), '');`)
  }
  searchTransactionDelete(transaction_id){
    return mysql.query(`SELECT id_transaccion FROM transaccion_del WHERE id_transaccion = ${transaction_id}`)
  }
}