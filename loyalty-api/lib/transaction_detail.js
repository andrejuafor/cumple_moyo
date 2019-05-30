'use strict'

const {Transaction, 
      TransactionDetail, 
      CuponSerie} = require('loyalty-db')

module.exports = {
  async transationDetail(transaction_id){
    //console.log('Consultamos la transaccion')
    try{
      //buscamos la info básica de la transacción
      let transactionGeneral = await Transaction.detailTransaction(transaction_id)
      //buscamos el detalle de la transacción:
      let transactionInfo = await TransactionDetail.detailTransactionDetail(transaction_id)
      //console.log('Aqui', transactionInfo)
      transactionGeneral[0].detalle = transactionInfo
      //buscamos los cupones para esta transacción y los ingresamos:
      let cupones = await TransactionDetail.couponsTransactionDetail(transaction_id)
      transactionGeneral[0].cupones = []
      console.log(cupones)
      if(cupones.length > 0){
        for(let item of cupones){
          let components = await CuponSerie.detailCuponSerie(item.id_cupon_serie)
          if(components.length > 0){
            transactionGeneral[0].cupones.push(components[0])
          }
        }
      }
      console.log(transactionGeneral)
      return transactionGeneral
    }catch(error){
      return error
    }
  },
  async transationOnlyDetail(transaction_id){
    //console.log('Consultamos la transaccion')
    try{
      //buscamos el detalle de la transacción:
      let transactionInfo = await TransactionDetail.detailTransactionDetail(transaction_id)
      let i = 0
      for(let info of transactionInfo){
        //insertamos los cupones en caso de existir
        let components = await CuponSerie.detailCuponSerie(info.id_cupon_serie)
        if(components.length > 0){
          transactionInfo[i].cupon = components
        }
        // borramos un id
        delete transactionInfo[i].id_cupon_serie
        i++
      }
      return transactionInfo
    }catch(error){
      return error
    }
  }
}