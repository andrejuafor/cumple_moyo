'use strict'

const express = require('express')
const asyncify = require('express-asyncify')
const Joi = require('joi')
const fs = require('fs')
const path = require('path')
const multer = require('multer')({
  dest:'public'
})
const parse = require('csv-parse')
const csv = require('fast-csv')
const uuidV4 = require('uuid/v4')
const Json2csvParser = require('json2csv').Parser;

const {joiValidate} = require('../lib/error')
const {
        Account, 
        Transaction, 
        TransactionDetail,
        TransactionDelete,
        OfficeAccount, 
        AntiFraud, 
        Category, 
        AccountCupon, 
        BenefitRegistry,
        ReferenceAccount,
        AccountReference,
        Office
      } = require('loyalty-db')
const {validate, validateAccount, validateTransaction, validatePaid} = require('../middlewares/middleware')
const {transationDetail} = require('../lib/transaction_detail')
const {validaCupon} = require('../lib/cupon')
const {consultaSaldo, saldoAhora} = require('../lib/saldo')
const {hoyTexto} = require('../lib/misselaneos')
const {existeCuenta, actualizaSaldo, actualizaSaldoAhora} = require('../lib/account')
const {checkBeneficio, beneficioMonto, validaLineaBach, referencias, creaTransaccionRef} = require('../lib/transaction')
const {asignaCupon} = require('../lib/cupon')
const {registraCodigoAmigo} = require('../lib/friend_code')
const {correoPagoPuntos, correoPagoMoyo} = require('../mailing/mailPagoPuntos')
const {correoTransaccion, correoTransaccionMoyo} = require('../mailing/mailTransaccion')
const {sendEmail} = require('../lib/sendgrid')

const routes = asyncify(express.Router())

const bodyDetail = Joi.object().keys({
  conditions: Joi.object().keys({
    transaction_id: Joi.number().required()
  }).required()
})
const bodyAddSubstractPoints = Joi.object().keys({
  transaction: Joi.object().keys({
    account: Joi.array().min(1).required().label('Se requiere por lo menos una cuenta'),
    points: Joi.number().required().label('Es necesario indicar el numero de puntos'),
    reference: Joi.string().required().label('La referencia es requerida'),
    validity: Joi.string(),
  }).required(),
  office: Joi.number().required().label('Es necesario enviar una sucursal')
})
const bodyPaid = Joi.object().keys({
  transaction: Joi.object().keys({
    account: Joi.string().required(),
    coupon: Joi.string().allow(['', ' ']),
    reference: Joi.string().required().label('La referencia es requerida'),
    concept: Joi.string().allow(['', ' ']),
    amount: Joi.number().required()
  }).required(),
  office: Joi.number().label('Es necesario enviar una sucursal')
})
const bodyPaidCoupon = Joi.object().keys({
  transaction: Joi.object().keys({
    account: Joi.string().required(),
    coupon: Joi.string().allow(['', ' ']),
  }).required(),
  office: Joi.number().label('Es necesario enviar una sucursal')
})
const bodyCapture = Joi.object().keys({
  transaction: Joi.object().keys({
    account: Joi.string().required().label('La cuenta es requerida'),
    reference: Joi.string().required().label('La referencia es requerida'),
    concept: Joi.string().allow(['',' ']),
    transactions: Joi.array().min(1).required().label('Es necesario por lo menos enviar un concepto'),
    coupon:Joi.string().allow(['']),
    referable:Joi.string().allow(['']),
    ewallet: Joi.any().valid([true, false]).required().label('Debe indicar si es monedero')
  }),
  office: Joi.number().label('Es necesario enviar una sucursal')
})
const bodyCaptureCoupon = Joi.object().keys({
  transaction: Joi.object().keys({
    account: Joi.string().required().label('La cuenta es requerida'),
    reference: Joi.string().allow(['']),
    concept: Joi.string().allow(['']),
    transactions: Joi.array().allow(['']),
    coupon:Joi.string().allow(['']),
    referable:Joi.string().allow(['']),
    ewallet: Joi.any().valid([true, false]).required().label('Debe indicar si es monedero'),
  }),
  office: Joi.number().label('Es necesario enviar una sucursal')
})
const bodyRedeemCoupon = Joi.object().keys({
  transaction: Joi.object().keys({
    account: Joi.string().required(),
    coupon: Joi.string().required()
  }),
  office: Joi.number().label('Es necesario enviar una sucursal')
})
const bodyDelete = Joi.object().keys({
  transaction: Joi.string().required()
})
const bodySearch = Joi.object().keys({
  conditions: Joi.object().keys({
    date_from: Joi.string().allow(['']),
    date_until: Joi.string().allow(['']),
    transaction_id: Joi.string().allow(['']),
    amount: Joi.number().allow(['']),
    office: Joi.number().allow(['']),
    points: Joi.number().allow(['']),
    reference: Joi.string().allow(['']),
    account: Joi.string().allow(['']),
    page_ini: Joi.number().allow(['']),
    page_end: Joi.number().allow(['']),
    export_file: Joi.any().valid([true, false]).required()
  })
})
const bodyReference = Joi.object().keys({
  conditions: Joi.object().keys({
    account: Joi.string().required().label('La cuenta es requerida')
  })
})

routes.post('/detail', validate, async(req, res, next) => {
  console.log('Request a transaction/detail')
  try{
    const { body } = req
    await Joi.validate(body, bodyDetail)
    let detailTransaction = await transationDetail(body.conditions.transaction_id)
    
    let returnObject = {
      error: false,
      total: detailTransaction.length,
      results: detailTransaction
    }
    return res.status(200).send(returnObject)
  }catch(err){
    return next(err)
  }
})
routes.post('/add_points', validate, async(req, res, next) => {
  console.log('Request a transaction/add_points')
  try{
    const { body } = req
    let returnObject = joiValidate(Joi.validate(body, bodyAddSubstractPoints, {abortEarly: false}))
    if(returnObject.error === true){
      return res.status(400).json(returnObject); 
    }
    let fechaHoy = await hoyTexto()
    let correctos = 0
    let errores = 0
    let erroneos =[]
    let vigencia = (body.transaction.validity !== undefined && body.transaction.validity !== '') ? body.transaction.validity : null
    if(body.transaction.points < 0){
      vigencia = null
    }
    let infoSucursal = await Office.searchOffice({ id_sucursal: body.office, id_comercio: req.dataLR.id_comercio })
    if(infoSucursal.length === 0){
      return res.status(400).send({error: true, message: 'La sucursal enviada no existe'})
    }
    for(let item of body.transaction.account){
      // validamos la cuenta
      let revisaCuenta = await existeCuenta(item)
      if(revisaCuenta.error === false){
        // creamos la transacción de suma de puntos
        let dataTransaction = {
          id_usuario: req.dataLR.id_usuario,
          id_sucursal: body.office,
          cuenta: revisaCuenta.result[0].cuenta,
          puntos: body.transaction.points,
          referencia: body.transaction.reference,
          concepto: 'Suma o resta de puntos',
          total: 0
        }
        let transaction_id = await Transaction.createTransaction(dataTransaction)
        let transactionDetail = {
          id_transaccion: transaction_id.insertId,
          id_punto: null,
          concepto: 'Suma o resta de puntos',
          referencia: '',
          puntos: body.transaction.points,
          porcentaje: 1,
          vigencia: vigencia,
          total: 0,
          id_cupon_serie: null
        }
        await TransactionDetail.createTransactionDetail(transactionDetail)
        let saldoFinalCuenta = await saldoAhora(revisaCuenta.result[0].cuenta, req.dataLR.id_comercio, '')
        // Actualizamos el saldo al dia:
        // await actualizaSaldoAhora(revisaCuenta.result[0].cuenta, req.dataLR.id_comercio, saldoFinalCuenta)
        // Enviamos el mailing:
        // ########################################
        // vemos si el comercio notifica transacciones:
        if(req.dataLR.notifica_transaccion === 1){
          // armamos la data para el contenido del mail:
          let dataMail = {
            nombreCliente: `${revisaCuenta.result[0].nombre} ${revisaCuenta.result[0].apellidos}`,
            emailCliente: revisaCuenta.result[0].email,
            nombreComercio: req.dataLR.nom_comercio,
            nombreSucursal: infoSucursal[0].nombre,
            pago:{
              id: transaction_id.insertId,
              concepto: body.transaction.reference,
              puntos: body.transaction.points
            },
            puntosTotales: saldoFinalCuenta, 
            saldoDinero: (saldoFinalCuenta / req.dataLR.punto_x_peso)
          }
          let contenidoCorreo = await correoPagoPuntos(dataMail)
          // enviamos el correo:
          let dataEnvia = {
            to: revisaCuenta.result[0].email,
            from: { name: req.dataLR.nom_comercio, email: 'noreply@loyaltyrefunds.com'},
            subject: (body.transaction.points > 0) ? '¡Tienes nuevos puntos!' : 'Se han restado puntos a tu cuenta',
            text: (body.transaction.points > 0) ? '¡Tienes nuevos puntos!' : 'Se han restado puntos a tu cuenta',
            html: contenidoCorreo,
            categoria_sendgrid: `agrega_quitar_puntos_${req.dataLR.id_comercio}` 
          }
          await sendEmail(dataEnvia)
        }
        correctos ++
      }else{
        errores ++
        erroneos.push(item)
      }
    }
    returnObject = {
      error: false,
      correctos: correctos,
      erroneos: errores,
      account_error: erroneos
    }
    return res.status(200).send(returnObject)
  }catch(err){
    return next(err)
  }
})
routes.post('/paid', validate, validateAccount, validatePaid, async(req, res, next) =>{
  console.log('Request a transaction/paid')
  try{
    let {body} = req
    if(body.transaction.coupon !== undefined && body.transaction.coupon !== ''){
      if(body.transaction.amount !== undefined && body.transaction.amount !== ''){
        await Joi.validate(body, bodyPaid)  
      }else{
        await Joi.validate(body, bodyPaidCoupon)
      }
    }else{
      await Joi.validate(body, bodyPaid)
    }
    
    if(body.transaction.amount <= 0){
        let returnObject = {
          error: true,
          message: "El monto del pago debe ser mayor a cero"
        }
        return res.status(400).send(returnObject)
    }
    // vemos si existe la cuenta en el comercio
    if(req.dataLR.existe_comercio === true){
      // vemos si la cuenta se encuentra en la sucursal:
      let validaCuentaSucursal = await OfficeAccount.searchOfficAccountSimple({id_sucursal: req.dataLR.id_sucursal, cuenta: req.dataLR.infoCuenta.cuenta})
      if(validaCuentaSucursal.length === 0){
        // si no existe lo agregamos en la sucursal:
        await OfficeAccount.addOfficeAccount({id_sucursal:req.dataLR.id_sucursal, cuenta: req.dataLR.infoCuenta.cuenta})
      }
      // vemos si la cuenta no está congelada:
      let cuentaCongelada = await Account.searchFrozen({cuenta: req.dataLR.infoCuenta.cuenta, id_comercio: req.dataLR.id_comercio})
      if(cuentaCongelada.length === 0){
        // Vemos si llegó un cupón valido primero lo ocupamos primero
        if(req.dataLR.infoCupon !== undefined){
          if(req.dataLR.infoCupon.tipo_retorno === 'informativo' || req.dataLR.infoCupon.tipo_retorno === 'punto_fijo'){
            console.log('**Tenemos Cupon informativo o de puntos fijos')
            // Si la transaccion solo trae cupon, retornamos el detalle solo del cupon
            let dataTransaction = {
              id_usuario: req.dataLR.id_usuario,
              cuenta: req.dataLR.infoCuenta.cuenta,
              id_sucursal: req.dataLR.id_sucursal,
              puntos: req.dataLR.infoCupon.puntos,
              total: 0,
              referencia: `Cupón ${req.dataLR.infoCupon.codigo}`,
              concepto: 'Redimir cupón',
              vigencia: null
            }
            let transaction_id = await Transaction.createTransaction(dataTransaction)
            let dataTransactionDetail = {
              id_transaccion: transaction_id.insertId,
              id_punto: null,
              puntos: req.dataLR.infoCupon.puntos,
              total: 0,
              porcentaje: 0,
              concepto: 'Redimir Cupón',
              referencia: (req.dataLR.infoCupon.tipo_retorno === 'punto_fijo') ? `Cupón puntos fijos` : `Cupón informativo`,
              vigencia: null,
              id_cupon_serie: req.dataLR.infoCupon.id_cupon_serie
            }
            //insertamos el detalle de la transaccion:
            await TransactionDetail.createTransactionDetail(dataTransactionDetail)
            // si es un cupon de punto_fijo sumamos los puntos a saldo diario:
            if(req.dataLR.infoCupon.tipo_retorno === 'punto_fijo'){
              await actualizaSaldo(req.dataLR.infoCuenta.cuenta, req.dataLR.id_comercio, req.dataLR.infoCupon.puntos)
            }
          }else{
            let returnObject = {
              error: true,
              message: "Este cupon no puede ser usado en pago con puntos"
            }
            return res.status(400).send(returnObject)
          }          
        }
        // vemos si la cuenta tiene el saldo suficiente:
        let saldoActual = await consultaSaldo(req.dataLR.infoCuenta.cuenta, req.dataLR.id_comercio, '')
        console.log(`Mi saldo actual es: ${saldoActual} y mi monto de transaccion es: ${body.transaction.amount}`)
        //generamos el pago con puntos:
        if(Number(saldoActual) >= Number(body.transaction.amount)){
          // generamos la transaccion:
          let dataTransaction = {
            id_usuario: req.dataLR.id_usuario,
            cuenta: req.dataLR.infoCuenta.cuenta,
            id_sucursal: req.dataLR.id_sucursal,
            puntos: (body.transaction.amount * req.dataLR.punto_x_peso * -1),
            total: body.transaction.amount,
            referencia: body.transaction.reference,
            concepto: body.transaction.concept,
            vigencia: null
          }
          let transaction_id = await Transaction.createTransaction(dataTransaction)
          let dataTransactionDetail = {
            id_transaccion: transaction_id.insertId,
            id_punto: null,
            puntos: (body.transaction.amount * req.dataLR.punto_x_peso * -1),
            total: body.transaction.amount,
            porcentaje: 0,
            concepto: 'Pago con Puntos',
            referencia: '',
            vigencia: null,
            id_cupon_serie: null
          }
          //insertamos el detalle de la transaccion:
          await TransactionDetail.createTransactionDetail(dataTransactionDetail)      
          // Obtenemos el detalle de la transaccion:          
          let detailTransactionFinal = await Transaction.detailTransaction(transaction_id.insertId)
          let returnObject = {
            error: false,
            total: detailTransactionFinal.length,
            result: detailTransactionFinal
          }
          // actualizamos la tabla de saldo al dia:
          let saldoFinal = await actualizaSaldo(req.dataLR.infoCuenta.cuenta, req.dataLR.id_comercio, (Number(body.transaction.amount) * -1))
          // Enviamos el mailing:
          // ########################################
          // vemos si el comercio notifica transacciones:
          if(req.dataLR.notifica_transaccion === 1){
            // consultamos el saldo de la cuenta:
            //let saldoFinalCuenta = await consultaSaldo(req.dataLR.infoCuenta.cuenta, req.dataLR.id_comercio, '')
            // armamos la data para el contenido del mail:
            let dataMail = {
              nombreCliente: `${req.dataLR.infoCuenta.nombre} ${req.dataLR.infoCuenta.apellidos}`,
              emailCliente: req.dataLR.infoCuenta.email,
              nombreComercio: req.dataLR.nom_comercio,
              nombreSucursal: req.dataLR.nom_sucursal,
              pago:{
                id: transaction_id.insertId,
                concepto: body.transaction.concept,
                puntos: body.transaction.amount
              },
              puntosTotales: (saldoFinal.montoFinal * req.dataLR.punto_x_peso),
              saldoDinero: saldoFinal.montoFinal
            }
            let contenidoCorreo = await correoPagoPuntos(dataMail)

            if(req.body.id_comercio === 417){
              contenidoCorreo = await correoPagoMoyo(dataMail)
            }
            
            // enviamos el correo:
            let dataEnvia = {
              to: req.dataLR.infoCuenta.email,
              from: { name: req.dataLR.nom_comercio, email: 'noreply@loyaltyrefunds.com'},
              subject: 'Tu pago con puntos',
              text: 'Tu pago con puntos',
              html: contenidoCorreo,
              categoria_sendgrid: `pago_puntos_${req.dataLR.id_comercio}` 
            }
            let envioCorreo = await sendEmail(dataEnvia)
            console.log('Estatus del envío del correo: ',envioCorreo)
          }
          // ########################################
          return res.status(200).send(returnObject)
        }else{
          let returnObject = {
            error: true,
            message: "Saldo insuficiente"
          }
          return res.status(400).send(returnObject)
        }
      }else{
        let returnObject = {
          error: true,
          message: "No puede realizar pagos, cuenta congelada"
        }
        return res.status(400).send(returnObject)
      } 
    }else{
      let returnObject = {
        error: true,
        message: "La cuenta no existe en el comercio"
      }
      return res.status(400).send(returnObject)
    }
  }catch(err){
    return next(err)
  }
})
routes.post('/reference', validate, validateAccount, async(req, res, next) => {
  console.log('Request a transaction/reference')
  try{
    const {body} = req
    await Joi.validate(body, bodyReference)
    let cuentasReferencia = await ReferenceAccount.accountReference(req.dataLR.infoCuenta.cuenta, req.dataLR.id_comercio)
    let infoNiveles = await ReferenceAccount.getLevels(req.dataLR.infoCuenta.cuenta, req.dataLR.id_comercio)
    let nivelesPiramidal = infoNiveles[0].nivel
    let cuentas = []
    if(cuentasReferencia.length > 0){
      let arregloDeCuentas = await referencias(cuentasReferencia, req.dataLR.id_comercio, nivelesPiramidal)
      for(let itemCuentas of cuentasReferencia){
        if((cuentas.indexOf(itemCuentas.cuenta) === -1) && itemCuentas.cuenta !== req.dataLR.infoCuenta.cuenta){
          cuentas.push(itemCuentas.cuenta)
        }
      }
      for(let itemArregloCuentas of arregloDeCuentas){
        if((cuentas.indexOf(itemArregloCuentas) === -1) && itemArregloCuentas !== req.dataLR.infoCuenta.cuenta){
          cuentas.push(itemArregloCuentas)
        }
      }
    }
    let returnObject = {
      error: false,
      total: cuentas.length,
      cuentasReferenciadas: cuentas
    }

    return res.status(200).send(returnObject)
  }catch(err){
    return next(err)
  }
})
routes.post('/capture', validate, validateAccount, validateTransaction, async(req, res, next) => {
  console.log('Request a transaction/capture')
  try{
    // validamos el header:
    const {body} = req
    console.log('**Datos que llegan de la captura:', body)
    let cuponAplicado = false
    let transaccionCupon = ''
    // vemos si solo viene el cupon y dependiendo el tipo pasamos una validación u otra:
    console.log(req.body)
    if(req.dataLR.infoCupon !== undefined){
      console.log('**Tenemos Cupon')
      if(body.transaction.transactions.length > 0 || body.transaction.reference !== ''){
        let returnObject = joiValidate(Joi.validate(body, bodyCapture, {abortEarly: false}))
        if(returnObject.error === true){
          return res.status(400).json(returnObject); 
        }
      }else{
        let returnObject = joiValidate(Joi.validate(body, bodyCaptureCoupon, {abortEarly: false}))
        if(returnObject === true){
          return res.status(400).json(returnObject); 
        }
      }
      body.transaction.concept = (body.transaction.concept !== undefined && body.transaction.concept !== '') ? body.transaction.concept : ''
      // SI EL CUPON ES INFORMATIVO O DE PUNTO FIJO LO CANJEAMOS DIRECTO:
      if(req.dataLR.infoCupon.tipo_retorno === 'informativo' || req.dataLR.infoCupon.tipo_retorno === 'punto_fijo'){
        console.log('**Tenemos Cupon informativo o de puntos fijos')
        // Si la transaccion solo trae cupon, retornamos el detalle solo del cupon
        let dataTransaction = {
          id_usuario: req.dataLR.id_usuario,
          cuenta: req.dataLR.infoCuenta.cuenta,
          id_sucursal: req.dataLR.id_sucursal,
          puntos: req.dataLR.infoCupon.puntos,
          total: 0,
          referencia: `Cupón ${req.dataLR.infoCupon.codigo}`,
          concepto: 'Redimir cupón',
          vigencia: null
        }
        let transaction_id = await Transaction.createTransaction(dataTransaction)
        let dataTransactionDetail = {
          id_transaccion: transaction_id.insertId,
          id_punto: null,
          puntos: req.dataLR.infoCupon.puntos,
          total: 0,
          porcentaje: 0,
          concepto: 'Redimir Cupón',
          referencia: (req.dataLR.infoCupon.tipo_retorno === 'punto_fijo') ? `Cupón puntos fijos` : `Cupón informativo`,
          vigencia: null,
          id_cupon_serie: req.dataLR.infoCupon.id_cupon_serie
        }
        //insertamos el detalle de la transaccion:
        TransactionDetail.createTransactionDetail(dataTransactionDetail)
        transaccionCupon = transaction_id.insertId
        cuponAplicado = true

        if(transaction.transactions === undefined && transactions.transactions.length === 0){
          console.log('**Solo tenemos cupon')
          let detailTransaction = await transationDetail(transaction_id.insertId)
          let returnObject = {
            error: false,
            total: detailTransaction.length,
            results: detailTransaction
          }
          return res.status(200).send(returnObject)
        }
      }
    }else{
      console.log('**Sin cupon')
      let returnObject = joiValidate(Joi.validate(body, bodyCapture, {abortEarly: false}))
      if(returnObject.error === true){
        return res.status(400).json(returnObject); 
      }
    }

    if(body.transaction.ewallet === true){
      body.transaction.concept = 'Monedero';
      console.log('Es monedero')
    }
    if(body.transaction.transactions.length === 0){
      if(cuponAplicado === true){
        let detailTransaction = await transationDetail(transaccionCupon)
        let returnObject = {
          error: false,
          total: detailTransaction.length,
          results: detailTransaction
        }
        console.log('Solo se envió cupon')
        return res.status(200).send(returnObject)
      }else{
        let returnObject = {
          error: true,
          message: "No se enviaron conceptos"
        }
        return res.status(400).send(returnObject)
      }
    }
    let asigna_cupon = []
    let id_sucursal_cuenta = ''
    // vemos si existe la cuenta en el comercio
    if(req.dataLR.existe_comercio === false){
      // si no existe lo agregamos en la sucursal:
      let agregaCuentaSucursal = await OfficeAccount.addOfficeAccount({id_sucursal:req.dataLR.id_sucursal, cuenta: req.dataLR.infoCuenta.cuenta})
      id_sucursal_cuenta = agregaCuentaSucursal.insertId
    }else{
      // vemos el id_sucursal cuenta que tiene:
      let infoSucursalCuenta = await OfficeAccount.searchOfficAccountSimple({id_sucursal:req.dataLR.id_sucursal, cuenta: req.dataLR.infoCuenta.cuenta})
      if(infoSucursalCuenta.length === 0){
        // lo agregamos a la sucursal
        let agregaCuentaSucursal = await OfficeAccount.addOfficeAccount({id_sucursal:req.dataLR.id_sucursal, cuenta: req.dataLR.infoCuenta.cuenta})
        id_sucursal_cuenta = agregaCuentaSucursal.insertId
      }else{
        id_sucursal_cuenta = infoSucursalCuenta[0].id_sucursal_cuenta
      }
    }
    
    //Revisamos cada transacción enviada para ver si no tenemos que regresarla:
    let montosAntiFraude = await AntiFraud.amountsTransaction(req.dataLR.id_comercio)
    //console.log('Montos antiFraude: ', montosAntiFraude)
    let montoMaxOper = 0
    let montoMaxGs = 0
    if(montosAntiFraude.length > 0){
      montoMaxOper = parseFloat(montosAntiFraude[0].max_oper)
      montoMaxGs = parseFloat(montosAntiFraude[0].max_gs)
    }

    let contador = 0
    let transaccionesValidas = 0
    let totalTransaccion = 0
    // validacion de la transaccion:
    for(let item of body.transaction.transactions){
      // validamos el monto:
      body.transaction.transactions[contador].valido = true
      totalTransaccion += parseFloat(item.amount)
      body.transaction.transactions[contador].amount = parseFloat(body.transaction.transactions[contador].amount)
      // converimos los montos para usarlos
      let montoTrans = parseFloat(item.amount)

      if(body.transaction.transactions[contador].length === 2){
        console.log('No llegó la información de transactions')
        body.transaction.transactions[contador].valido = false
        body.transaction.transactions[contador].mensaje = 'Debe enviar el id de la categoría y el monto'
      }else if(montoTrans <= 0){
        console.log('Monto incorrecto <= 0')
        body.transaction.transactions[contador].valido = false
        body.transaction.transactions[contador].mensaje = 'El monto de la categoría debe ser mayor a cero'
      }else if((montoMaxOper > 0) && (montoTrans >= montoMaxOper)  && (req.dataLR.perfil === 'operador')){
        console.log('El monto del operador esta mal')
        body.transaction.transactions[contador].valido = false
        body.transaction.transactions[contador].mensaje = 'No tienes permiso de capturar ese monto'
      }else if((montoMaxGs > 0) && (montoTrans >= montoMaxGs) && (req.dataLR.perfil === 'gerente' || req.dataLR.perfil === 'supervisor')){
          console.log('El monto del gerente/supervisor esta mal')
          body.transaction.transactions[contador].valido = false
          body.transaction.transactions[contador].mensaje = 'No tienes permiso de capturar ese monto'
      }

      if(body.transaction.transactions[contador].valido === true){
        // ahora validamos la categoria:
        let infoCategoria = await Category.activeCategory({id_categoria: item.category})
        if(infoCategoria.length > 0){
          // validamos que la categoría sea del comercio/sucursal:
          if(infoCategoria[0].id_sucursal === req.dataLR.id_sucursal || infoCategoria[0].id_comercio === req.dataLR.id_comercio){
            // si existe vemos que esté disponible en ese momento:
            if(infoCategoria[0].dia_habilitado === 1 && infoCategoria[0].horario_habilitado === 1){
              body.transaction.transactions[contador].infoCategory = infoCategoria
              transaccionesValidas ++
            }else{
              console.log('Categoría sin habilitar')
              body.transaction.transactions[contador].valido = false
              body.transaction.transactions[contador].mensaje = 'La categoría no está habilitada en estos momentos'
            }
          }else{
            console.log('Categoría no existe 1')
            body.transaction.transactions[contador].valido = false
            body.transaction.transactions[contador].mensaje = 'La categoría no existe'
          }
        }else{
          console.log('Categoría no existe 2')
          body.transaction.transactions[contador].valido = false
          body.transaction.transactions[contador].mensaje = 'La categoría no existe'
        }
      }
      contador++
    }
    
    if((montoMaxOper > 0 || montoMaxGs > 0) && (cuponAplicado === false)){
      if((totalTransaccion >=  montoMaxOper && montoMaxOper > 0) && (req.dataLR.perfil === 'operador')){
        console.log(`Oper: La transacción de ${totalTransaccion} es mayor a ${montoMaxOper}`)
        let returnObject = {
          error: true,
          message: `No puedes realizar transacciones de mayores a ${totalTransaccion}`,
        }
        return res.status(400).send(returnObject)
      }else if((totalTransaccion >=  montoMaxGs  && montoMaxGs > 0) && (req.dataLR.perfil === 'gerente' || req.dataLR.perfil === 'supervisor')){
        console.log(`Ger/Sup: La transacción de ${totalTransaccion} es mayor a ${montoMaxGs}`)
        let returnObject = {
          error: true,
          message: `No puedes realizar transacciones de mayores a ${totalTransaccion}`,
        }
        return res.status(400).send(returnObject)
      }
    }
    // validamos las transacciones:
    if(transaccionesValidas ===  body.transaction.transactions.length){
      // si tenemos transacciones validas, generamos la transacción:
      let dataTransaction = {
        id_usuario: req.dataLR.id_usuario,
        id_sucursal: req.dataLR.id_sucursal,
        cuenta: req.dataLR.infoCuenta.cuenta,
        puntos: 0,
        referencia: body.transaction.reference,
        concepto: body.transaction.concept,
        total: totalTransaccion
      }
      let transaction_id = await Transaction.createTransaction(dataTransaction)
      // Revisamos los beneficios:
      let ben = await checkBeneficio(req.dataLR.id_comercio, req.dataLR.infoCuenta.cuenta, totalTransaccion)
      // Ahora cargamos todas las categorias a transaccion_detalle:
      let cupon_aplicado = false
      let puntosTotales = 0
      let conceptosMailing = []
      let cuponMailing = []
      let contadorItems = 0
      
      for(let item of body.transaction.transactions){
        // item.infoCategory
        let tot = parseFloat(item.amount)
        // ########################################
        // Establecemos la vigencia
        //vemos la vigencia en días:
        let vigencia = item.infoCategory[0].vigencia

        if(item.infoCategory[0].vigencia_fija !== '0000-00-00'){
          vigencia = item.infoCategory[0].vigencia_fija
        }
        // ########################################
        let porcentaje = ben.porcentaje > item.infoCategory[0].porcentaje ? ben.porcentaje : item.infoCategory[0].porcentaje
        // En caso de aplicar generamos beneficio multinivel
        if(ben.id_cupon !== undefined && cupon_aplicado === false){
          //vemos si el cupon es valido y en caso de ser valido lo asignamos
          let asigna_cupon = await asignaCupon(ben.id_cupon,req.dataLR.id_comercio)
          if(asigna_cupon.error === false){
            cupon_aplicado = true
            // Le asignamos el cupon al usuario:
            await AccountCupon.createAccountCupon({serie_id: asigna_cupon.cupon_serie, cuenta_id: id_sucursal_cuenta})
            // ########################################
            cuponMailing.push({codigo:asigna_cupon.codigo, vigencia:asigna_cupon.cupon.vig, nombre: asigna_cupon.cupon.nombre })
            // ########################################
          }
        }
        
        // Revisamos el cupon que se recibió del formulario:
        let id_cupon_serie = null
        let fixed = 0
        let puntos_fijos = 0 //Puntos fijos si existe cupon
        let vigencia_fijos = null // Vigencia de puntos fijos si existe
        //Si existe el cupon:
        if(req.dataLR.infoCupon !== undefined){
          // Vemos el tipo de retorno:
          let _perc = Number(porcentaje)
          if(req.dataLR.infoCupon.tipo_retorno === 'punto_fijo'){
            _perc = Number(req.dataLR.infoCupon.puntos) * -1
            puntos_fijos = Number(req.dataLR.infoCupon.puntos)
          }else if(req.dataLR.infoCupon.tipo_retorno === 'porcentaje_fijo'){
            if(_perc > Number(req.dataLR.infoCupon.puntos)){
              _perc = porcentaje
            }else{
              _perc = Number(req.dataLR.infoCupon.puntos)
            }
          }else if(req.dataLR.infoCupon.tipo_retorno === 'multiplicar'){
            _perc = _perc * Number(req.dataLR.infoCupon.puntos) 
          }else if(req.dataLR.infoCupon.tipo_retorno === 'sumar'){
            _perc = _perc + Number(req.dataLR.infoCupon.puntos) 
          }

          if(puntos_fijos > 0){
            id_cupon_serie = req.dataLR.infoCupon.id_cupon_serie
            vigencia_fijos = req.dataLR.infoCupon.vigencia
          }else{
            cupon_aplicado = false
            if(_perc < 0){
              fixed = Math.abs(_perc)
            }else{
              id_cupon_serie = req.dataLR.infoCupon.id_cupon_serie
              vigencia_fijos = req.dataLR.infoCupon.vigencia
              porcentaje = _perc
              cupon_aplicado = true
            }
          }

        }

        let p = Number(tot) * (Number(porcentaje) / 100);
        if(fixed > p && fixed > 0){
          id_cupon_serie = req.dataLR.infoCupon.id_cupon_serie
          p = fixed
        }
        // Si el porcentaje es cero, los puntos son cero, no importa beneficios
        if(item.infoCategory[0].porcentaje <= 0 && ben.porcentaje <= 0){
          p = 0
        }

        puntosTotales += Number(p)
        let referencia = ''
        
        if(ben.nombre !== undefined){
          referencia += ` ${ben.nombre}`
        }
        if(ben.id_cupon !== '' && cupon_aplicado === true && ben.id_cupon !== undefined){
          referencia += `Cupon empleado ${asigna_cupon.cupon.nombre} : ${asigna_cupon.codigo}`
        }
        
        if(vigencia_fijos !== null){
          if(vigencia !== null){
            let fecha_vigencia_fijos = new Date(vigencia_fijos)
            let fecha_vigencia_act = new Date(vigencia)
            if(fecha_vigencia_fijos > fecha_vigencia_act){
              vigencia = vigencia_fijos
            }
          }
        }
        // Generamos el detalle de la transaccion de forma normal
        let transactionDetail = {
          id_transaccion: transaction_id.insertId,
          id_punto: item.category,
          concepto: item.infoCategory[0].nombre,
          referencia: (referencia === undefined || referencia === '') ? body.transaction.reference : referencia,
          puntos: p <= 0.5 ? 0 : Math.round(p),
          porcentaje: porcentaje / 100,
          vigencia: vigencia,
          total: Number(tot),
          id_cupon_serie: id_cupon_serie
        }
        TransactionDetail.createTransactionDetail(transactionDetail)
        // Agregamos el concepto para el mailing:
        conceptosMailing.push({tipo:'captura', nombre: item.infoCategory[0].nombre, puntos: p <= 0.5 ? 0 : Math.round(p), vigencia: vigencia})

        // Fin del for of  
        contadorItems++
      }
      // actualizamos los datos de la transacción:
      let dataActualizaTransaccion = {
        id_transaccion: transaction_id.insertId,
        puntos: puntosTotales
      }
      if(asigna_cupon.codigo !== undefined && asigna_cupon.codigo !== ''){
        dataActualizaTransaccion.cupon_generado = asigna_cupon.codigo
      }
      // Actualizamos la transaccion
      Transaction.updateTransaction(dataActualizaTransaccion)  
      
      // AQUI VA LO DEL PIRAMIDAL
      // ##########################
      // Si esta opción está activa, al generar una transacción como operador y capturar una cuenta en el campo de referenciable, 
      // la cuenta sobre la que se hace la transacción se asociará de manera permanente a la referenciable.
      let cuentasReferencia = await ReferenceAccount.accountReference(req.dataLR.infoCuenta.cuenta, req.dataLR.id_comercio)
      if(cuentasReferencia.length === 0){
        if(body.transaction.referable !== undefined && body.transaction.referable !== ''){
          if(req.dataLR.ref_automatico === 1){
            // buscamos el id de la cuenta referenciable en cuenta_ref: 
            let infoReferenciable = await AccountReference.searchAccountReference({cuenta: body.transaction.referable})
            if(infoReferenciable.length > 0){
              //guardamos la cuenta dentro de las referenciables:
              let dataReferenciable = {
                id_cuenta: null,
                cuenta : req.dataLR.infoCuenta.cuenta,
                id_cuenta_ref: infoReferenciable[0].id_cuenta_ref
              }
              await ReferenceAccount.createReferenceAccount(dataReferenciable)
              //Volvemos a consultar para refrescar la variable
              cuentasReferencia = await ReferenceAccount.accountReference(req.dataLR.infoCuenta.cuenta, req.dataLR.id_comercio)
            }
          }
        }
      }

      let infoNiveles = await ReferenceAccount.getLevels(req.dataLR.infoCuenta.cuenta, req.dataLR.id_comercio)
      let nivelesPiramidal = infoNiveles[0].nivel

      if(body.transaction.referable !== undefined && body.transaction.referable !== '' && body.transaction.ewallet === false){
        // Creamos la transacción del referenciable:
        await creaTransaccionRef(transaction_id.insertId, body.transaction.referable, req.dataLR.id_comercio, req.dataLR.id_sucursal, req.dataLR.id_usuario,req.dataLR.notifica_transaccion)
      }
      if(cuentasReferencia.length > 0){
        let arregloDeCuentas = await referencias(cuentasReferencia, req.dataLR.id_comercio, nivelesPiramidal)
        let cuentas = []
        for(let itemCuentas of cuentasReferencia){
          if((cuentas.indexOf(itemCuentas.cuenta) === -1) && itemCuentas.cuenta !== req.dataLR.infoCuenta.cuenta){
            cuentas.push(itemCuentas.cuenta)
          }
        }
        for(let itemArregloCuentas of arregloDeCuentas){
          if((cuentas.indexOf(itemArregloCuentas) === -1) && itemArregloCuentas !== req.dataLR.infoCuenta.cuenta){
            cuentas.push(itemArregloCuentas)
          }
        }
        //insertamos las cuentas:
        for(let infoCuentas of cuentas){
          // Validamos si enviaron una cuenta referenciable y está en la lista no insertamos ya que ya se le dió un beneficio por referencia
          if(infoCuentas !== body.transaction.referable){
            //creamos la transacción de la referencia:
            await creaTransaccionRef(transaction_id.insertId, infoCuentas, req.dataLR.id_comercio, req.dataLR.id_sucursal, req.dataLR.id_usuario,req.dataLR.notifica_transaccion)
          }
        }
      }
      // ##########################
      // VERIFICAMOS BENEFICIO POR MONTO DE COMPRA
      let montoCompra = await BenefitRegistry.searchBenefitTransaction({id_comercio:req.dataLR.id_comercio, type: 'monto_compra'})
      if(montoCompra.length > 0){
        if(montoCompra[0].tiempo === 11111){
          if(totalTransaccion >= montoCompra[0].monto){
            let dataTransaction = {
              id_usuario: req.dataLR.id_usuario,
              id_sucursal: req.dataLR.id_sucursal,
              cuenta: req.dataLR.infoCuenta.cuenta,
              puntos: Math.round(Number(montoCompra[0].puntos)),
              referencia: montoCompra[0].nombre,
              concepto: montoCompra[0].nombre,
              total: 0
            }
            let altaTransaccionBeneficioMonto = await Transaction.createTransaction(dataTransaction)
            let dataTransactionDetail = {
              id_transaccion: altaTransaccionBeneficioMonto.insertId,
              id_punto: null,
              referencia: `${montoCompra[0].nombre} en transacción ${transaction_id.insertId}`,
              concepto: montoCompra[0].nombre,
              puntos: Math.round(Number(montoCompra[0].puntos)),
              porcentaje: 1,
              vigencia: montoCompra[0].vigencia,
              total: 0,
              id_cupon_serie: null
            }
            await TransactionDetail.createTransactionDetail(dataTransactionDetail)
            // Agregamos el concepto para el mailing:
            conceptosMailing.push({tipo:'beneficio', nombre: montoCompra[0].nombre, puntos: Math.round(Number(montoCompra[0].puntos)), vigencia: montoCompra[0].vigencia})
          }
        }else{
          // Hay que verificar ya que el monto de compra lo valida con una suma, no debería ser un monto con ese total?
          //  y no el total de transacciones que den ese monto?
          let validaBeneficio = await beneficioMonto(req.dataLR.id_comercio, req.dataLR.infoCuenta.cuenta, montoCompra[0].id_beneficio_refistro, totalTransaccion)
          if(validaBeneficio === true){
            let dataTransaction = {
              id_usuario: req.dataLR.id_usuario,
              id_sucursal: req.dataLR.id_sucursal,
              cuenta: req.dataLR.infoCuenta.cuenta,
              puntos: Math.round(Number(montoCompra[0].puntos)),
              referencia: montoCompra[0].nombre,
              concepto: montoCompra[0].nombre,
              total: 0
            }
            let altaTransaccionBeneficioMonto = await Transaction.createTransaction(dataTransaction)
            let dataTransactionDetail = {
              id_transaccion: altaTransaccionBeneficioMonto.insertId,
              id_punto: null,
              referencia: montoCompra[0].nombre,
              concepto: montoCompra[0].nombre,
              puntos: Math.round(Number(montoCompra[0].puntos)),
              porcentaje: 1,
              vigencia: montoCompra[0].vigencia,
              total: 0,
              id_cupon_serie: null
            }
            await TransactionDetail.createTransactionDetail(dataTransactionDetail)
            // Agregamos el concepto para el mailing:
            conceptosMailing.push({tipo:'beneficio', nombre: montoCompra[0].nombre, puntos: Math.round(Number(montoCompra[0].puntos)), vigencia: montoCompra[0].vigencia})
          }            
        }
      }
      // VERIFICAMOS SI TIENE BENEFICIO POR PRIMERA COMPRA
      let beneficioPrimeraCompra = await BenefitRegistry.searchBenefitTransaction({id_comercio:req.dataLR.id_comercio, type: 'primera_compra'})
      if(beneficioPrimeraCompra > 0){
        // vemos el numero de compra que tiene el cliente:
        let numeroCompra = await Transaction.transactionNumberPurchase(req.dataLR.infoCuenta.cuenta,req.dataLR.id_comercio)
        if(numeroCompra[0].num_compra === 1){
          // Creamos la transacción:
          let dataTransaction = {
            id_usuario: req.dataLR.id_usuario,
            id_sucursal: req.dataLR.id_sucursal,
            cuenta: req.dataLR.infoCuenta.cuenta,
            puntos: Math.round(Number(beneficioPrimeraCompra[0].puntos)),
            referencia: beneficioPrimeraCompra[0].nombre,
            concepto: beneficioPrimeraCompra[0].nombre,
            total: 0
          }
          let altaTransaccionBeneficioMonto = await Transaction.createTransaction(dataTransaction)
          let dataTransactionDetail = {
            id_transaccion: altaTransaccionBeneficioMonto.insertId,
            id_punto: null,
            referencia: `${beneficioPrimeraCompra[0].nombre} en transacción ${transaction_id.insertId}`,
            concepto: beneficioPrimeraCompra[0].nombre,
            puntos: Math.round(Number(beneficioPrimeraCompra[0].puntos)),
            porcentaje: 1,
            vigencia: beneficioPrimeraCompra[0].vigencia,
            total: 0,
            id_cupon_serie: null
          }
          await TransactionDetail.createTransactionDetail(dataTransactionDetail)
          // Agregamos el concepto para el mailing:
          conceptosMailing.push({tipo:'beneficio', nombre: beneficioPrimeraCompra[0].nombre, puntos: Math.round(Number(beneficioPrimeraCompra[0].puntos)), vigencia: beneficioPrimeraCompra[0].vigencia})
        }
      }
      // VEMOS SI TIENE BENEFICIO POR NUMERO DE COMPRA
      let beneficioNumeroCompra = await BenefitRegistry.searchBenefitTransaction({id_comercio:req.dataLR.id_comercio, type: 'numero_compra'})
      if(beneficioNumeroCompra > 0){
        // vemos el numero de compra que tiene el cliente:
        let numeroCompra = await Transaction.transactionNumberPurchase(req.dataLR.infoCuenta.cuenta,req.dataLR.id_comercio)
        if(numeroCompra[0].num_compra === beneficioNumeroCompra[0].no_compra){
          // Creamos la transacción:
          let dataTransaction = {
            id_usuario: req.dataLR.id_usuario,
            id_sucursal: req.dataLR.id_sucursal,
            cuenta: req.dataLR.infoCuenta.cuenta,
            puntos: Math.round(Number(beneficioNumeroCompra[0].puntos)),
            referencia: beneficioNumeroCompra[0].nombre,
            concepto: beneficioNumeroCompra[0].nombre,
            total: 0
          }
          let altaTransaccionBeneficioMonto = await Transaction.createTransaction(dataTransaction)
          let dataTransactionDetail = {
            id_transaccion: altaTransaccionBeneficioMonto.insertId,
            id_punto: null,
            referencia: `${beneficioNumeroCompra[0].nombre} en transacción ${transaction_id.insertId}`,
            concepto: beneficioNumeroCompra[0].nombre,
            puntos: Math.round(Number(beneficioNumeroCompra[0].puntos)),
            porcentaje: 1,
            vigencia: beneficioNumeroCompra[0].vigencia,
            total: 0,
            id_cupon_serie: null
          }
          await TransactionDetail.createTransactionDetail(dataTransactionDetail)
          // Agregamos el concepto para el mailing:
          conceptosMailing.push({tipo:'beneficio', nombre: beneficioNumeroCompra[0].nombre, puntos: Math.round(Number(beneficioNumeroCompra[0].puntos)), vigencia: beneficioNumeroCompra[0].vigencia})
        }
      }
      // VEMOS SI TIENE BENEFICIO DE CODIGO AMIGO
      // Primero vemos si tiene una cuenta de amigo:
      if(req.dataLR.infoCuenta.cuenta_amigo !== '' && req.dataLR.infoCuenta.cuenta_amigo !== null && req.dataLR.infoCuenta.cuenta_amigo !== undefined){
        console.log(`Aplica codigo amigo de captura; la cuenta de amigo es: ${req.dataLR.infoCuenta.cuenta_amigo}`)
        await registraCodigoAmigo(2, req.dataLR.id_comercio, req.dataLR.nom_comercio, req.dataLR.infoCuenta.cuenta_amigo, req.dataLR.infoCuenta.cuenta, req.dataLR.corporativo, req.dataLR.round_puntos, req.dataLR.notifica_transaccion)
      }
      
      let detailTransaction = await transationDetail(transaction_id.insertId)
      let returnObject = {
        error: false,
        total: detailTransaction.length,
        results: detailTransaction
      }
      let saldoFinalCuenta = await saldoAhora(req.dataLR.infoCuenta.cuenta, req.dataLR.id_comercio, '')
      // Actualizamos el saldo al dia:
      await actualizaSaldoAhora(req.dataLR.infoCuenta.cuenta, req.dataLR.id_comercio, saldoFinalCuenta)

      // ########################################
      // vemos si el comercio notifica transacciones:
      if(req.dataLR.notifica_transaccion === 1){
        console.log('notificamos la transaccion')
        // armamos la data para el contenido del mail:
        let dataMail = {
          nombreCliente: `${req.dataLR.infoCuenta.nombre} ${req.dataLR.infoCuenta.apellidos}`,
          emailCliente: req.dataLR.infoCuenta.email,
          nombreComercio: req.dataLR.nom_comercio,
          nombreSucursal: req.dataLR.nom_sucursal,
          conceptos: conceptosMailing,
          puntosTotales: (saldoFinalCuenta * req.dataLR.punto_x_peso),
          saldoDinero: saldoFinalCuenta,
        }
        if(cuponMailing.length > 0){
          dataMail.cupon = cuponMailing
        }
        let contenidoCorreo = await correoTransaccion(dataMail)
        // SI EL COMERCIO ES MOYO
        // ##################################
        if(req.dataLR.id_comercio === 417){
          console.log('El comercio es Moyo')
          dataMail = {
            nombreCliente: `${req.dataLR.infoCuenta.nombre} ${req.dataLR.infoCuenta.apellidos}`,
            emailCliente: req.dataLR.infoCuenta.email,
            nombreComercio: req.dataLR.nom_comercio,
            nombreSucursal: req.dataLR.nom_sucursal,
            puntos: totalTransaccion,
            puntosTotales: (saldoFinalCuenta * req.dataLR.punto_x_peso),
            saldoDinero: saldoFinalCuenta
          }
          if(cuponMailing.length > 0){
            dataMail.cupon = cuponMailing
          }
          contenidoCorreo = await correoTransaccionMoyo(dataMail)
        }
        // ##################################
        // enviamos el correo:
        let dataEnvia = {
          to: req.dataLR.infoCuenta.email,
          from: { name: req.dataLR.nom_comercio, email: 'noreply@loyaltyrefunds.com'},
          subject: '¡Tienes nuevos puntos!',
          text: '¡Tienes nuevos puntos!',
          html: contenidoCorreo,
          categoria_sendgrid: `transaccion_${req.dataLR.id_comercio}` 
        }
        sendEmail(dataEnvia)
        // console.log('Estatus del envío del correo: ',envioCorreo)
      }
      // ########################################
      console.log('Terminamos la transaccion')
      return res.status(200).send(returnObject)
    }else{
      let returnObject = {
        error: true,
        message: 'La información de transacciones es erronea.',
        detail: body.transaction.transactions
      }
      return res.status(400).send(returnObject)
    }
  }catch(err){
    return next(err)
  }
})
routes.post('/redeem_coupon', validate, validateAccount, async(req, res, next) => {
  console.log('Request a transaction/redeem_coupon')
  try{
    // validamos el header:
    const {body} = req
    let validate = await Joi.validate(body, bodyRedeemCoupon)
    // vemos si existe la cuenta en el comercio
    if(req.dataLR.existe_comercio === false){
      // Lo registramos en la sucursal
    }
    // Validamos si existe el cupon:
    let cuponValido = await validaCupon(body.transaction.coupon,req.dataLR.id_comercio, req.dataLR.infoCuenta.cuenta)
    if(cuponValido.cuponValido === true){
      //Creamos la transacción:
      let dataTransaction = {
        id_usuario: req.dataLR.id_usuario,
        cuenta: req.dataLR.infoCuenta.cuenta,
        puntos: Math.round(Number(cuponValido.infoCupon.puntos)),
        referencia: `Cupón ${body.transaction.coupon}`,
        concepto: 'Redimir Cupón',
        total: 0
      }
      let altaTransaccionCupon = await Transaction.createTransaction(dataTransaction)
      let dataTransactionDetail = {
        id_transaccion: altaTransaccionCupon.insertId,
        id_punto: null,
        referencia: `Cupón ${body.transaction.coupon}`,
        concepto: 'Redimir Cupón',
        puntos: Math.round(Number(cuponValido.infoCupon.puntos)),
        porcentaje: 1,
        vigencia: cuponValido.infoCupon.vigencia,
        total: 0,
        id_cupon_serie: cuponValido.infoCupon.id_cupon_serie
      }
      let altaTransaccionDetBeneficioMonto = await TransactionDetail.createTransactionDetail(dataTransactionDetail)
      let detailTransaction = await transationDetail(altaTransaccionCupon.insertId)
      let returnObject = {
        error: false,
        total: detailTransaction.length,
        results: detailTransaction
      }
      // Actualizamos el saldo al dia:
      let saldoFinalCuenta = await saldoAhora(req.dataLR.infoCuenta.cuenta, req.dataLR.id_comercio, '')
      await actualizaSaldoAhora(req.dataLR.infoCuenta.cuenta, req.dataLR.id_comercio, saldoFinalCuenta)

      return res.status(200).send(returnObject)
    }else{
      returnObject = {
        error: true,
        message: cuponValido.message
      }
      return res.status(400).send(returnObject)
    } 
  }catch(err){
    return next(err)
  }
})
// Falta pantalla de redimir cupon
routes.post('/search', validate, async(req, res, next) => {
  console.log('Request a transaction/search')
  try{
    let {body} = req
    let validate = await Joi.validate(body, bodySearch)
    let dataBusqueda = {}
    if(req.dataLR.tipo_usuario === 'comercio'){
      dataBusqueda.id_sucursal = req.dataLR.id_sucursal
    }else if(req.dataLR.tipo_usuario === 'admin_comercio'){
      dataBusqueda.id_comercio = req.dataLR.id_comercio
    }
    if(body.conditions.date_from !== undefined && body.conditions.date_from !== '') dataBusqueda.fecha_desde = body.conditions.date_from
    if(body.conditions.date_until !== undefined && body.conditions.date_until !== '') dataBusqueda.fecha_hasta = body.conditions.date_until
    if(body.conditions.transaction_id !== undefined && body.conditions.transaction_id !== '') dataBusqueda.id_transaccion = body.conditions.transaction_id
    if(body.conditions.points !== undefined && body.conditions.points !== '') dataBusqueda.puntos = body.conditions.points
    //if(body.conditions.office !== undefined && body.conditions.office !== '') dataBusqueda.id_sucursal = body.conditions.office
    if(body.conditions.reference !== undefined && body.conditions.reference !== '') dataBusqueda.referencia = body.conditions.reference
    if(body.conditions.account !== undefined && body.conditions.account !== '') dataBusqueda.cuenta = body.conditions.account
    if(body.conditions.amount !== undefined && body.conditions.amount !== '') dataBusqueda.total = body.conditions.amount
    if(body.conditions.page_ini !== undefined && body.conditions.page_ini !== '') dataBusqueda.pagina_ini = body.conditions.page_ini
    if(body.conditions.page_end !== undefined && body.conditions.page_end !== '') dataBusqueda.pagina_fin = body.conditions.page_end
    dataBusqueda.export_file = body.conditions.export_file
    
    if(body.conditions.export_file === true){
      let transactionSearch = await Transaction.searchTransactionSimpleCsv(dataBusqueda)

      console.log('Generamos el archivo en csv')
      let dt = new Date()
      let month = dt.getMonth()+1
      let day = dt.getDate()
      let year = dt.getFullYear()
      let hour = dt.getHours()
      let minute = dt.getMinutes()

      let nombreArchivo = `rep_transacciones_${month}${day}${year}_${hour}${minute}.csv`
      let file = path.join('public/', nombreArchivo)
      
      // Generamos el archivo
      const fields = ['id_transaccion','sucursal','cuenta','referencia','concepto','fecha','operador','categoria','vigencia','total','puntos','referenciaDetalle','cupon','invalidada']
      const json2csvParser = new Json2csvParser({ fields });
      let datosCsv = json2csvParser.parse(transactionSearch);
      datosCsv = datosCsv.replace(/["']/g, "")
      fs.writeFileSync(`public/${nombreArchivo}`,datosCsv)

      // Generamos la descarga:
      let archivoValido = false
      if(fs.accessSync(file)) {
        archivoValido = true
      }
      
      res.setHeader('Content-disposition', `attachment; filename=${nombreArchivo}`);
      res.set('Content-Type', 'text/csv');
      return res.status(200).download(file);  
      
    }else{
      let transactionSearch = await Transaction.searchTransactionSimple(dataBusqueda)
      let totalRegistros = await Transaction.searchTransactionSimple(dataBusqueda, true)
      let returnObject = {
        error:false,
        total: totalRegistros[0].total,
        results: transactionSearch
      }
      return res.status(200).send(returnObject)
    }
    
  }catch(err){
    return err
  }
})
routes.post('/upload', multer.single('attachment'), validate, async(req, res, next) => {
  console.log('Request a transaction/upload')
  try{
    let archivo = req.file
    console.log(archivo)
    let erroneos = []
    let fileExtension = archivo.originalname.split('.')
    if((archivo.mimetype === 'text/csv' || archivo.mimetype === 'application/vnd.ms-excel') && (fileExtension[1].toLowerCase() === 'csv')){
      let parser = parse({delimiter: ','}, async(err, data) => {
        let contador = 0
        if(data === undefined){
          let returnObject = {
            error: true,
            message: "El archivo tiene un formato incorrecto"
          }
          return res.status(400).send(returnObject)
        }

        for(let info of data){
          if(contador > 0){
            let dataValida = await validaLineaBach(info, req.dataLR.id_sucursal, req.dataLR.id_comercio, req.dataLR.requiere_clave)
            if(dataValida.error === false){
              // Procesamos el pago:
              /**
               * dataValida:{
               *  sucursalActual,
               *  nomSucursal,
               *  infoCuenta,
               *  infoCategoria,
               *  infoCupon
               * }
               */
              let asigna_cupon = []
              let id_sucursal_cuenta = ''
              // vemos si existe la cuenta en el comercio
              if(req.dataLR.existe_comercio === false){
                // si no existe lo agregamos en la sucursal:
                let agregaCuentaSucursal = await OfficeAccount.addOfficeAccount({id_sucursal:dataValida.sucursalActual, cuenta: dataValida.infoCuenta.cuenta})
                id_sucursal_cuenta = agregaCuentaSucursal.insertId
              }else{
                // vemos el id_sucursal cuenta que tiene:
                let infoSucursalCuenta = await OfficeAccount.searchOfficAccountSimple({id_sucursal:dataValida.sucursalActual, cuenta: dataValida.infoCuenta.cuenta})
                if(infoSucursalCuenta.length === 0){
                  // lo agregamos a la sucursal
                  let agregaCuentaSucursal = await OfficeAccount.addOfficeAccount({id_sucursal:dataValida.sucursalActual, cuenta: dataValida.infoCuenta.cuenta})
                  id_sucursal_cuenta = agregaCuentaSucursal.insertId
                }else{
                  id_sucursal_cuenta = infoSucursalCuenta[0].id_sucursal_cuenta
                }
              }
              if((dataValida.infoCupon !== undefined) && (dataValida.infoCupon.tipo_retorno === 'informativo' || dataValida.infoCupon.tipo_retorno === 'punto_fijo')){
                console.log('**Tenemos Cupon informativo o de puntos fijos')
                // Si la transaccion solo trae cupon, retornamos el detalle solo del cupon
                let dataTransaction = {
                  id_usuario: req.dataLR.id_usuario,
                  cuenta: dataValida.infoCuenta.cuenta,
                  id_sucursal: sucursalActual,
                  puntos: dataValida.infoCupon.puntos,
                  total: 0,
                  referencia: `Cupón ${dataValida.infoCupon.codigo}`,
                  concepto: 'Redimir cupón',
                  vigencia: null
                }
                let transaction_id = await Transaction.createTransaction(dataTransaction)
                let dataTransactionDetail = {
                  id_transaccion: transaction_id.insertId,
                  id_punto: null,
                  puntos: dataValida.infoCupon.puntos,
                  total: 0,
                  porcentaje: 0,
                  concepto: 'Redimir Cupón',
                  referencia: (dataValida.infoCupon.tipo_retorno === 'punto_fijo') ? `Cupón puntos fijos` : `Cupón informativo`,
                  vigencia: null,
                  id_cupon_serie: dataValida.infoCupon.id_cupon_serie
                }
                //insertamos el detalle de la transaccion:
                await TransactionDetail.createTransactionDetail(dataTransactionDetail)
                transaccionCupon = transaction_id.insertId
                cuponAplicado = true
              }
              // si tenemos transacciones validas, generamos la transacción:
              let totalTransaccion = info[6]
              let dataTransaction = {
                id_usuario: req.dataLR.id_usuario,
                id_sucursal: dataValida.sucursalActual,
                cuenta: dataValida.infoCuenta.cuenta,
                puntos: 0,
                referencia: info[3],
                concepto: info[2],
                total: totalTransaccion
              }
              let transaction_id = await Transaction.createTransaction(dataTransaction)
              // Revisamos los beneficios:
              let ben = await checkBeneficio(req.dataLR.id_comercio, dataValida.infoCuenta.cuenta, totalTransaccion)
              // Ahora cargamos todas las categorias a transaccion_detalle:
              let cupon_aplicado = false
              let puntosTotales = 0
              let conceptosMailing = []
              let cuponMailing = []

              // item.infoCategory
              let tot = parseFloat(totalTransaccion)
              // ########################################
              // Establecemos la vigencia
              //vemos la vigencia en días:
              let vigencia = dataValida.infoCategoria.vigencia

              if(dataValida.infoCategoria.vigencia_fija !== '0000-00-00'){
                vigencia = dataValida.infoCategoria.vigencia_fija
              }
              // ########################################
              let porcentaje = ben.porcentaje > dataValida.infoCategoria.porcentaje ? ben.porcentaje : dataValida.infoCategoria.porcentaje
              // En caso de aplicar generamos beneficio multinivel
              if(ben.id_cupon !== undefined && cupon_aplicado === false){
                //vemos si el cupon es valido y en caso de ser valido lo asignamos
                let asigna_cupon = await asignaCupon(ben.id_cupon,req.dataLR.id_comercio)
                if(asigna_cupon.error === false){
                  cupon_aplicado = true
                  // Le asignamos el cupon al usuario:
                  await AccountCupon.createAccountCupon({serie_id: asigna_cupon.cupon_serie, cuenta_id: id_sucursal_cuenta})
                  // ########################################
                  cuponMailing.push({codigo: asigna_cupon.codigo, vigencia: asigna_cupon.cupon.vig, nombre: asigna_cupon.cupon.nombre })
                  // ########################################
                }
              }
              
              // Revisamos el cupon que se recibió del formulario:
              let id_cupon_serie = null
              let fixed = 0
              let puntos_fijos = 0 //Puntos fijos si existe cupon
              let vigencia_fijos = null // Vigencia de puntos fijos si existe
              //Si existe el cupon:
              if(dataValida.infoCupon !== undefined){
                // Vemos el tipo de retorno:
                let _perc = Number(porcentaje)
                if(dataValida.infoCupon.tipo_retorno === 'punto_fijo'){
                  _perc = Number(dataValida.infoCupon.puntos) * -1
                  puntos_fijos = Number(dataValida.infoCupon.puntos)
                }else if(dataValida.infoCupon.tipo_retorno === 'porcentaje_fijo'){
                  if(_perc > Number(dataValida.infoCupon.puntos)){
                    _perc = porcentaje
                  }else{
                    _perc = Number(dataValida.infoCupon.puntos)
                  }
                }else if(dataValida.infoCupon.tipo_retorno === 'multiplicar'){
                  _perc = _perc * Number(dataValida.infoCupon.puntos) 
                }else if(dataValida.infoCupon.tipo_retorno === 'sumar'){
                  _perc = _perc + Number(dataValida.infoCupon.puntos) 
                }
                if(puntos_fijos > 0){
                  id_cupon_serie = dataValida.infoCupon.id_cupon_serie
                  vigencia_fijos = dataValida.infoCupon.vigencia
                }else{
                  cupon_aplicado = false
                  if(_perc < 0){
                    fixed = Math.abs(_perc)
                  }else{
                    id_cupon_serie = dataValida.infoCupon.id_cupon_serie
                    vigencia_fijos = dataValida.infoCupon.vigencia
                    porcentaje = _perc
                    cupon_aplicado = true
                  }
                }

              }

              let p = Number(tot) * (Number(porcentaje) / 100);
              if(fixed > p && fixed > 0){
                id_cupon_serie = dataValida.infoCupon.id_cupon_serie
                p = fixed
              }
              // Si el porcentaje es cero, los puntos son cero, no importa beneficios
              if(dataValida.infoCategoria.porcentaje <= 0 && ben.porcentaje <= 0){
                p = 0
              }

              puntosTotales += Number(p)
              let referencia = ''
              
              if(ben.nombre !== undefined){
                referencia += ` ${ben.nombre}`
              }
              if(ben.id_cupon !== '' && cupon_aplicado === true && ben.id_cupon !== undefined){
                referencia += `Cupon empleado ${asigna_cupon.cupon.nombre} : ${asigna_cupon.codigo}`
              }
              
              if(vigencia_fijos !== null){
                if(vigencia !== null){
                  let fecha_vigencia_fijos = new Date(vigencia_fijos)
                  let fecha_vigencia_act = new Date(vigencia)
                  if(fecha_vigencia_fijos > fecha_vigencia_act){
                    vigencia = vigencia_fijos
                  }
                }
              }
              // Generamos el detalle de la transaccion de forma normal
              let transactionDetail = {
                id_transaccion: transaction_id.insertId,
                id_punto: dataValida.infoCategoria.id_categoria,
                concepto: dataValida.infoCategoria.nombre,
                referencia: (referencia === undefined || referencia === '') ? '' : referencia,
                puntos: p <= 0.5 ? 0 : Math.round(p),
                porcentaje: porcentaje / 100,
                vigencia: vigencia,
                total: Number(tot),
                id_cupon_serie: id_cupon_serie
              }
              TransactionDetail.createTransactionDetail(transactionDetail)
              Transaction.updateTransaction({id_transaccion: transaction_id.insertId, puntos: p <= 0.5 ? 0 : Math.round(p)})
              // Agregamos el concepto para el mailing:
              conceptosMailing.push({tipo:'captura', nombre: dataValida.infoCategoria.nombre, puntos: p <= 0.5 ? 0 : Math.round(p), vigencia: vigencia})

              if(asigna_cupon.codigo !== undefined && asigna_cupon.codigo !== ''){
                // actualizamos los datos de la transacción:
                let dataActualizaTransaccion = {
                  id_transaccion: transaction_id.insertId,
                  cupon_generado: asigna_cupon.codigo
                }
                // Actualizamos la transaccion
                Transaction.updateTransaction(dataActualizaTransaccion)  
              }
              // AQUI VA LO DEL PIRAMIDAL
              // ##########################
              // Si esta opción está activa, al generar una transacción como operador y capturar una cuenta en el campo de referenciable, 
              // la cuenta sobre la que se hace la transacción se asociará de manera permanente a la referenciable.
              // let cuentasReferencia = await ReferenceAccount.accountReference(dataValida.infoCuenta.cuenta, req.dataLR.id_comercio)
              // if(cuentasReferencia.length === 0){
              //   if(transaction.referable !== undefined && transaction.referable !== ''){
              //     if(req.dataLR.ref_automatico === 1){
              //       // buscamos el id de la cuenta referenciable en cuenta_ref: 
              //       let infoReferenciable = await AccountReference.searchAccountReference({cuenta: transaction.referable})
              //       if(infoReferenciable.length > 0){
              //         //guardamos la cuenta dentro de las referenciables:
              //         let dataReferenciable = {
              //           id_cuenta: null,
              //           cuenta : dataValida.infoCuenta.cuenta,
              //           id_cuenta_ref: infoReferenciable[0].id_cuenta_ref
              //         }
              //         await ReferenceAccount.createReferenceAccount(dataReferenciable)
              //         //Volvemos a consultar para refrescar la variable
              //         cuentasReferencia = await ReferenceAccount.accountReference(dataValida.infoCuenta.cuenta, req.dataLR.id_comercio)
              //       }
              //     }
              //   }
              // }

              // let infoNiveles = await ReferenceAccount.getLevels(dataValida.infoCuenta.cuenta, req.dataLR.id_comercio)
              // let nivelesPiramidal = infoNiveles[0].nivel

              // if(transaction.referable !== undefined && transaction.referable !== ''){
              //   // Creamos la transacción del referenciable:
              //   await creaTransaccionRef(transaction_id.insertId, transaction.referable, req.dataLR.id_comercio, dataValida.sucursalActual, req.dataLR.id_usuario,req.dataLR.notifica_transaccion)
              // }
              /*
              // En archivo no se manejan referenciables
              if(cuentasReferencia.length > 0){
                let arregloDeCuentas = await referencias(cuentasReferencia, req.dataLR.id_comercio, nivelesPiramidal)
                let cuentas = []
                for(let itemCuentas of cuentasReferencia){
                  if((cuentas.indexOf(itemCuentas.cuenta) === -1) && itemCuentas.cuenta !== dataValida.infoCuenta.cuenta){
                    cuentas.push(itemCuentas.cuenta)
                  }
                }
                for(let itemArregloCuentas of arregloDeCuentas){
                  if((cuentas.indexOf(itemArregloCuentas) === -1) && itemArregloCuentas !== dataValida.infoCuenta.cuenta){
                    cuentas.push(itemArregloCuentas)
                  }
                }
                //insertamos las cuentas:
                for(let infoCuentas of cuentas){
                  // Validamos si enviaron una cuenta referenciable y está en la lista no insertamos ya que ya se le dió un beneficio por referencia
                  if(infoCuentas !== transaction.referable){
                    //creamos la transacción de la referencia:
                    await creaTransaccionRef(transaction_id.insertId, infoCuentas, req.dataLR.id_comercio, dataValida.sucursalActual, req.dataLR.id_usuario, req.dataLR.notifica_transaccion)
                  }
                }
              }
              */
              // ##########################
              // VERIFICAMOS BENEFICIO POR MONTO DE COMPRA
              let montoCompra = await BenefitRegistry.searchBenefitTransaction({id_comercio:req.dataLR.id_comercio, type: 'monto_compra'})
              if(montoCompra.length > 0){
                if(montoCompra[0].tiempo === '11111'){
                  if(montoCompra[0].monto === totalTransaccion){
                    let dataTransaction = {
                      id_usuario: req.dataLR.id_usuario,
                      id_sucursal: dataValida.sucursalActual,
                      cuenta: dataValida.infoCuenta.cuenta,
                      puntos: Math.round(Number(montoCompra[0].puntos)),
                      referencia: montoCompra[0].nombre,
                      concepto: montoCompra[0].nombre,
                      total: 0
                    }
                    let altaTransaccionBeneficioMonto = await Transaction.createTransaction(dataTransaction)
                    let dataTransactionDetail = {
                      id_transaccion: altaTransaccionBeneficioMonto.insertId,
                      id_punto: null,
                      referencia: montoCompra[0].nombre,
                      concepto: montoCompra[0].nombre,
                      puntos: Math.round(Number(montoCompra[0].puntos)),
                      porcentaje: 1,
                      vigencia: montoCompra[0].vigencia,
                      total: 0,
                      id_cupon_serie: null
                    }
                    TransactionDetail.createTransactionDetail(dataTransactionDetail)
                    // Agregamos el concepto para el mailing:
                    conceptosMailing.push({tipo:'beneficio', nombre: montoCompra[0].nombre, puntos: Math.round(Number(montoCompra[0].puntos)), vigencia: montoCompra[0].vigencia})
                  }
                }else{
                  // Hay que verificar ya que el monto de compra lo valida con una suma, no debería ser un monto con ese total?
                  //  y no el total de transacciones que den ese monto?
                  let validaBeneficio = await beneficioMonto(req.dataLR.id_comercio, dataValida.infoCuenta.cuenta, montoCompra[0].id_beneficio_refistro, totalTransaccion)
                  if(validaBeneficio === true){
                    let dataTransaction = {
                      id_usuario: req.dataLR.id_usuario,
                      id_sucursal: dataValida.sucursalActual,
                      cuenta: dataValida.infoCuenta.cuenta,
                      puntos: Math.round(Number(montoCompra[0].puntos)),
                      referencia: montoCompra[0].nombre,
                      concepto: montoCompra[0].nombre,
                      total: 0
                    }
                    let altaTransaccionBeneficioMonto = await Transaction.createTransaction(dataTransaction)
                    let dataTransactionDetail = {
                      id_transaccion: altaTransaccionBeneficioMonto.insertId,
                      id_punto: null,
                      referencia: montoCompra[0].nombre,
                      concepto: montoCompra[0].nombre,
                      puntos: Math.round(Number(montoCompra[0].puntos)),
                      porcentaje: 1,
                      vigencia: montoCompra[0].vigencia,
                      total: 0,
                      id_cupon_serie: null
                    }
                    TransactionDetail.createTransactionDetail(dataTransactionDetail)
                    // Agregamos el concepto para el mailing:
                    conceptosMailing.push({tipo:'beneficio', nombre: montoCompra[0].nombre, puntos: Math.round(Number(montoCompra[0].puntos)), vigencia: montoCompra[0].vigencia})
                  }            
                }
              }
              // VERIFICAMOS SI TIENE BENEFICIO POR PRIMERA COMPRA
              let beneficioPrimeraCompra = await BenefitRegistry.searchBenefitTransaction({id_comercio:req.dataLR.id_comercio, type: 'primera_compra'})
              if(beneficioPrimeraCompra > 0){
                // vemos el numero de compra que tiene el cliente:
                let numeroCompra = await Transaction.transactionNumberPurchase(dataValida.infoCuenta.cuenta,req.dataLR.id_comercio)
                if(numeroCompra[0].num_compra === 1){
                  // Creamos la transacción:
                  let dataTransaction = {
                    id_usuario: req.dataLR.id_usuario,
                    id_sucursal: dataValida.sucursalActual,
                    cuenta: dataValida.infoCuenta.cuenta,
                    puntos: Math.round(Number(beneficioPrimeraCompra[0].puntos)),
                    referencia: beneficioPrimeraCompra[0].nombre,
                    concepto: beneficioPrimeraCompra[0].nombre,
                    total: 0
                  }
                  let altaTransaccionBeneficioMonto = await Transaction.createTransaction(dataTransaction)
                  let dataTransactionDetail = {
                    id_transaccion: altaTransaccionBeneficioMonto.insertId,
                    id_punto: null,
                    referencia: beneficioPrimeraCompra[0].nombre,
                    concepto: beneficioPrimeraCompra[0].nombre,
                    puntos: Math.round(Number(beneficioPrimeraCompra[0].puntos)),
                    porcentaje: 1,
                    vigencia: beneficioPrimeraCompra[0].vigencia,
                    total: 0,
                    id_cupon_serie: null
                  }
                  TransactionDetail.createTransactionDetail(dataTransactionDetail)
                  // Agregamos el concepto para el mailing:
                  conceptosMailing.push({tipo:'beneficio', nombre: beneficioPrimeraCompra[0].nombre, puntos: Math.round(Number(beneficioPrimeraCompra[0].puntos)), vigencia: beneficioPrimeraCompra[0].vigencia})
                }
              }
              // VEMOS SI TIENE BENEFICIO POR NUMERO DE COMPRA
              let beneficioNumeroCompra = await BenefitRegistry.searchBenefitTransaction({id_comercio:req.dataLR.id_comercio, type: 'numero_compra'})
              if(beneficioNumeroCompra > 0){
                // vemos el numero de compra que tiene el cliente:
                let numeroCompra = await Transaction.transactionNumberPurchase(dataValida.infoCuenta.cuenta,req.dataLR.id_comercio)
                if(numeroCompra[0].num_compra === beneficioNumeroCompra[0].no_compra){
                  // Creamos la transacción:
                  let dataTransaction = {
                    id_usuario: req.dataLR.id_usuario,
                    id_sucursal: dataValida.sucursalActual,
                    cuenta: dataValida.infoCuenta.cuenta,
                    puntos: Math.round(Number(beneficioNumeroCompra[0].puntos)),
                    referencia: beneficioNumeroCompra[0].nombre,
                    concepto: beneficioNumeroCompra[0].nombre,
                    total: 0
                  }
                  let altaTransaccionBeneficioMonto = await Transaction.createTransaction(dataTransaction)
                  let dataTransactionDetail = {
                    id_transaccion: altaTransaccionBeneficioMonto.insertId,
                    id_punto: null,
                    referencia: beneficioNumeroCompra[0].nombre,
                    concepto: beneficioNumeroCompra[0].nombre,
                    puntos: Math.round(Number(beneficioNumeroCompra[0].puntos)),
                    porcentaje: 1,
                    vigencia: beneficioNumeroCompra[0].vigencia,
                    total: 0,
                    id_cupon_serie: null
                  }
                  TransactionDetail.createTransactionDetail(dataTransactionDetail)
                  // Agregamos el concepto para el mailing:
                  conceptosMailing.push({tipo:'beneficio', nombre: beneficioNumeroCompra[0].nombre, puntos: Math.round(Number(beneficioNumeroCompra[0].puntos)), vigencia: beneficioNumeroCompra[0].vigencia})
                }
              }
              // VEMOS SI TIENE BENEFICIO DE CODIGO AMIGO
              // Primero vemos si tiene una cuenta de amigo:
              if(dataValida.infoCuenta.cuenta_amigo !== '' && dataValida.infoCuenta.cuenta_amigo !== null && dataValida.infoCuenta.cuenta_amigo !== undefined){
                console.log(`Si tiene cuenta amigo: ${dataValida.infoCuenta.cuenta_amigo}`)
                registraCodigoAmigo(2, req.dataLR.id_comercio, req.dataLR.nom_comercio, dataValida.infoCuenta.cuenta_amigo, dataValida.infoCuenta.cuenta, req.dataLR.corporativo, req.dataLR.round_puntos, req.dataLR.notifica_transaccion)
              }
              
              transationDetail(transaction_id.insertId)
              
              // ########### PROCESO DE ACTUALIZACION DE SALDO ###########
              // let saldoFinalCuenta = await saldoAhora(dataValida.infoCuenta.cuenta, req.dataLR.id_comercio, '')
              // Actualizamos el saldo al dia:
              // await actualizaSaldoAhora(dataValida.infoCuenta.cuenta, req.dataLR.id_comercio, saldoFinalCuenta)

              // ########################################
              // vemos si el comercio notifica transacciones:
              if(req.dataLR.notifica_transaccion === 1){
                // ########################
                // Borrar esta linea cuando se active el saldo al dia.
                let saldoFinalCuenta = await saldoAhora(dataValida.infoCuenta.cuenta, req.dataLR.id_comercio, '')
                // ########################
                // armamos la data para el contenido del mail:
                let dataMail = {
                  nombreCliente: `${dataValida.infoCuenta.nombre} ${dataValida.infoCuenta.apellidos}`,
                  emailCliente: dataValida.infoCuenta.email,
                  nombreComercio: req.dataLR.nom_comercio,
                  nombreSucursal: dataValida.nomSucursal,
                  conceptos: conceptosMailing,
                  puntosTotales: (saldoFinalCuenta * req.dataLR.punto_x_peso),
                  saldoDinero: saldoFinalCuenta,
                }
                if(cuponMailing.length > 0){
                  dataMail.cupon = cuponMailing
                }
                let contenidoCorreo = await correoTransaccion(dataMail)
                // SI EL COMERCIO ES MOYO
                // ##################################
                if(req.dataLR.id_comercio === 417){
                  console.log('El comercio es Moyo')
                  dataMail = {
                    nombreCliente: `${dataValida.infoCuenta.nombre} ${dataValida.infoCuenta.apellidos}`,
                    emailCliente: dataValida.infoCuenta.email,
                    nombreComercio: req.dataLR.nom_comercio,
                    nombreSucursal: dataValida.nomSucursal,
                    puntos: totalTransaccion,
                    puntosTotales: (saldoFinalCuenta * req.dataLR.punto_x_peso),
                    saldoDinero: saldoFinalCuenta
                  }
                  if(cuponMailing.length > 0){
                    dataMail.cupon = cuponMailing
                  }
                  contenidoCorreo = await correoTransaccionMoyo(dataMail)
                }
                // ##################################
                // enviamos el correo:
                let dataEnvia = {
                  to: dataValida.infoCuenta.email,
                  from: { name: req.dataLR.nom_comercio, email: 'noreply@loyaltyrefunds.com'},
                  subject: '¡Tienes nuevos puntos!',
                  text: '¡Tienes nuevos puntos!',
                  html: contenidoCorreo,
                  categoria_sendgrid: `transaccion_${req.dataLR.id_comercio}` 
                }
                sendEmail(dataEnvia)
                //console.log('Estatus del envío del correo: ',envioCorreo)
              }
              // ########################################

              //console.log(dataValida)
            }else{
              info[7] = (info[7] !== '' || info[7] !== undefined) ? info[7] : ''
              info[8] = dataValida.message
              erroneos.push(info) 
            }
          }
          contador++
        }

        let returnObject = {
          error: (erroneos.length > 0) ? true :  false,
          errores: erroneos.length,
          procesados: contador-1
        }
        if(erroneos.length > 0){
          if(erroneos.length <= 10){
            returnObject.erroneos = erroneos
          }
          // creamos el csv:
          let nombreArchivo = `${uuidV4()}.csv`
          returnObject.url = nombreArchivo
          let file = fs.createWriteStream(`public/${nombreArchivo}`)
          csv.
              write(erroneos)
              .pipe(file)
        }
        return res.status(200).send(returnObject)
      })
      fs.createReadStream(req.file.path).pipe(parser)
      //fs.unlinkSync(archivo.path)
    }else{
      let returnObject = {
        error: false,
        message: "El archivo tiene que ser extención .csv"
      }
      fs.unlinkSync(archivo.path)
      return res.status(400).send(returnObject)
    }

  }catch(err){
    return next(err)
  }
})
routes.get('/error_file/:file(*)',  async(req, res) => {
  try{
    // vemos si existe el archivo:
    let file = path.join('public/', req.params.file)
    console.log(file)
    let archivoValido = false
    if(fs.accessSync(file)) {
      archivoValido = true
    }
    res.setHeader('Content-disposition', `attachment; filename=${req.params.file}`);
    res.set('Content-Type', 'text/csv');
    res.download(file);  
    
  }catch(err){
    let returnObject = {
      error: true,
      message: "El archivo no existe"
    }
    return res.status(400).send(returnObject)
  }
})
routes.post('/delete', validate, async(req, res, next) => {
  console.log('Request a transaction/delete')
  try{
    const {transaction} = req.body
    await Joi.validate(transaction, bodyDelete)
    // Primero vemos si existe:
    let buscaTransaccionDelete = await TransactionDelete.searchTransactionDelete(transaction.transaction)
    if(buscaTransaccionDelete.length === 0){
      let dataDelete = {
        id_transaccion: transaction.transaction,
        id_usuario: (req.dataLR.id_usuario !== null) ? req.dataLR.id_usuario : null
      }
      await TransactionDelete.deleteTransaction(dataDelete)
      // recalculamos el saldo:
      let infoTransaccion = await Transaction.searchTransaction({id_transaccion: transaction.transaction})

      let saldoFinalCuenta = await saldoAhora(infoTransaccion[0].cuenta, req.dataLR.id_comercio, '')
      // Actualizamos el saldo al dia:
      await actualizaSaldoAhora(infoTransaccion[0].cuenta, req.dataLR.id_comercio, saldoFinalCuenta)

      let returnObject = {
        error: false,
        message: "La transacción fue eliminada correctamente"
      }
      return res.status(200).send(returnObject)
    }else{
      let returnObject = {
        error: true,
        message: "La transacción ya se encuentra eliminada"
      }
      return res.status(400).send(returnObject)
    }
  }catch(error){
    return next(error)
  }
})

module.exports = routes
