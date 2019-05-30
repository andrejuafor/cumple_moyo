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
const {Account, Transaction, OfficeAccount, BenefitRegistry, TransactionDetail, AccountCupon, User, Cupon, Merchant} = require('loyalty-db')
const {validate, validateAccount, pocosDatos} = require('../middlewares/middleware')
const {consultaSaldo, saldoAhora} = require('../lib/saldo')
const {transationOnlyDetail} = require('../lib/transaction_detail')
const {hoyTexto} = require('../lib/misselaneos')
const {validaCel, validaMail, passCuenta, existeCuenta, crearNumero, validaLineaBachCuenta, actualizaSaldoAhora, validaPassword} = require('../lib/account')
const {asignaCupon} = require('../lib/cupon')
const {registraCodigoAmigo} = require('../lib/friend_code')
const {correoBienvenida} = require('../mailing/mailBienvenida')
const {sendEmail} = require('../lib/sendgrid')
const {beneficioCumpleRegistro} = require('../lib/benefit')

const routes = asyncify(express.Router())

const bodyAccountDetail = Joi.object().keys({
  conditions: Joi.object().keys({
    account: Joi.string().required()
  }).required()
})
const bodyCreate = Joi.object().keys({
  account: Joi.object().keys({
    number: Joi.string().allow(['']),
    key: Joi.string().allow(['']),
    email: Joi.string().email().required().label('El email es requerido'),
    cel: Joi.string().required().label('El teléfono celular es requerido'),
    name: Joi.string().required().label('El nombre es requerido'),
    lastname: Joi.string().required().label('El apellido es requerido'),
    zip_code: Joi.string().required().label('El código postal es requerido'),
    birthday: Joi.string().required().label('La fecha de nacimiento es requerida'), //AAAA-MM-DD
    gender: Joi.string().allow(['', ' ']),
    comments: Joi.string().allow(['', ' ']),
    friend: Joi.string().allow(['', ' ']),
    ewallet: Joi.any().valid([true, false]).required().label('Debe indicar si es monedero')
  }).required(),
  office: Joi.number()
})
const bodyCreateLittleData = Joi.object().keys({
  account: Joi.object().keys({
    number: Joi.string().allow(['', ' ']),
    key: Joi.string().allow(['', ' ']),
    email: Joi.string().email().allow(['', ' ',' ']),
    cel: Joi.string().allow(['',' ']),
    name: Joi.string().required().label('El nombre es requerido'),
    lastname: Joi.string().allow(['',' ']),
    zip_code: Joi.string().required().label('El codigo postal es requerido'),
    birthday: Joi.string().allow(['',' ']), //AAAA-MM-DD
    gender: Joi.string().allow(['', ' ']),
    comments: Joi.string().allow(['', ' ']),
    friend: Joi.string().allow(['', ' ']),
    ewallet: Joi.any().valid([true, false]).required().label('Debe indicar si es monedero')
  }).required(),
  office: Joi.number()
})
const bodyAddInMerchant = Joi.object().keys({
  account:Joi.object().keys({
    account: Joi.string().required(),
    office: Joi.number().required(),
    comments: Joi.string()
  }).required()
})
const bodyUpdate = Joi.object().keys({
  account: Joi.object().keys({
    account: Joi.string().required(),
    email: Joi.string().email(),
    cel: Joi.string(),
    name: Joi.string(),
    lastname: Joi.string(),
    zip_code: Joi.string(),
    birthday: Joi.string(),
    gender: Joi.string().allow(['', ' ']),
    comments: Joi.string().allow(['', ' ']),
    friend: Joi.string().allow(['', ' ']),
  }).required()
})
const bodySearch = Joi.object().keys({
  conditions: Joi.object().keys({
    account: Joi.string().allow(['',' ']),
    email: Joi.string().allow(['',' ']),
    cel: Joi.string().allow(['',' ']),
    name: Joi.string().allow(['',' ']),
    lastname: Joi.string().allow(['',' ']),
    zip_code: Joi.string().allow(['',' ']),
    age: Joi.number().allow(['',' ']), 
    gender: Joi.string().valid(['m', 'f', 'w', '']),
    office: Joi.number().allow(['',' ']),
    // member_since: Joi.string().allow(['',' ']), // AAAA-MM-DD
    page_ini: Joi.number().allow(['']),
    page_end: Joi.number().allow(['']),
    export_file: Joi.any().valid([true, false]).required()
  }).required()
})
const bodyValidaClave = Joi.object().keys({
  conditions: Joi.object().keys({
    account: Joi.string().required()
  }).required()
})

routes.post('/search', validate, async(req, res, next) => {
  console.log('Request a account/search')
  try{
    const {body} = req
    await Joi.validate(body, bodySearch)
    let dataBusqueda = {
      id_comercio: req.dataLR.id_comercio,
      export_file: body.conditions.export_file
    }

    if(body.conditions.account !== undefined && body.conditions.account !== ''){ dataBusqueda.cuenta = body.conditions.account }
    if(body.conditions.email !== undefined && body.conditions.email !== ''){ dataBusqueda.email = body.conditions.email }
    if(body.conditions.name !== undefined && body.conditions.name !== ''){ dataBusqueda.nombre = body.conditions.name }
    if(body.conditions.lastname !== undefined && body.conditions.lastname !== ''){ dataBusqueda.apellidos = body.conditions.lastname }
    if(body.conditions.cel !== undefined && body.conditions.cel !== ''){ dataBusqueda.cel = body.conditions.cel }
    if(body.conditions.zip_code !== undefined && body.conditions.zip_code !== ''){ dataBusqueda.codigo_postal = body.conditions.zip_code }
    if(body.conditions.gender !== undefined && body.conditions.gender !== ''){ dataBusqueda.sexo = body.conditions.gender }
    if(body.conditions.age !== undefined && body.conditions.age !== ''){ dataBusqueda.edad = body.conditions.age }
    if(body.conditions.office !== undefined && body.conditions.office !== ''){ dataBusqueda.id_sucursal = body.conditions.office }
    if(body.conditions.page_ini !== undefined && body.conditions.page_ini !== '') { dataBusqueda.pagina_ini = body.conditions.page_ini }
    if(body.conditions.page_end !== undefined && body.conditions.page_end !== '') { dataBusqueda.pagina_fin = body.conditions.page_end }
    
    if(body.conditions.export_file === true){
      
      let cuentaBusqueda = await Account.searchAccountSimple(dataBusqueda, true)
      console.log('Generamos el archivo en csv de cuentas')
      let dt = new Date()
      let month = dt.getMonth()+1
      let day = dt.getDate()
      let year = dt.getFullYear()
      let hour = dt.getHours()
      let minute = dt.getMinutes()

      let nombreArchivo = `rep_cuentas_${month}${day}${year}_${hour}${minute}.csv`
      let file = path.join('public/', nombreArchivo)
      const fields = ['cuenta', 'nombre', 'apellidos', 'email', 'cel', 'codigo_postal', 'fecha_nac_dia', 'fecha_nac_mes', 'fecha_nac_ano', 'sexo', 'edad']
      const json2csvParser = new Json2csvParser({ fields });
      let datosCsv = json2csvParser.parse(cuentaBusqueda);
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
      let totalRegistros = await Account.searchAccountSimple(dataBusqueda)
      let cuentaBusqueda = await Account.searchAccountSimple(dataBusqueda, true)
      let returnObject = {
        error:false,
        total: totalRegistros[0].total,
        results: cuentaBusqueda
      }
      return res.status(200).send(returnObject)
    }
  }catch(err){
    return next(err)
  }
})
routes.post('/detail', validate, validateAccount, async(req, res, next) => {
  console.log('Request a account/detail')
  try{
    // validamos el header:
    const {body} = req
    //console.log('Request a la cuenta: ', req.dataLR.infoCuenta.cuenta)
    await Joi.validate(body, bodyAccountDetail)
    // vemos si existe la cuenta en el comercio
    if(req.dataLR.existe_comercio === true){
      let fechaSaldo = await hoyTexto()
      // ahora obtenemos el saldo
      let saldoResult = await consultaSaldo(req.dataLR.infoCuenta.cuenta, req.dataLR.id_comercio, fechaSaldo)
      req.dataLR.infoCuenta.saldo = saldoResult
      let returnObject = {
        error: false,
        total: 1,
        results: req.dataLR.infoCuenta
      }
      return res.status(200).send(returnObject)
    }else{
      let returnObject = {
        error: true,
        message: "La cuenta no existe en el comercio"
      }
      return res.status(400).send(returnObject)
    }
  }catch(err){
    next(err)
  }
})
routes.post('/detail_complete', validate, validateAccount, async(req, res, next) =>{
  console.log('Request a account/detail_complete')
  try{

  }catch(err){
    return next(err)
  }
})
routes.post('/transactions', validate, validateAccount, async(req, res, next) => {
  console.log('Request a account/transactions')
  try{
    // validamos el header:
    const {body} = req
    await Joi.validate(body, bodyAccountDetail)
    // vemos si existe la cuenta en el comercio
    if(req.dataLR.existe_comercio === true){
      // Buscamos las transacciones de este usuario:
      let dataTransaction = {
        cuenta: req.dataLR.infoCuenta.cuenta,
        id_comercio: req.dataLR.id_comercio
      }
      let trasactionsResult = await Transaction.searchTransaction(dataTransaction)
      
      let contador = 0
      for(let item of trasactionsResult){
        let detailTransaction = await transationOnlyDetail(item.id_transaccion)
        trasactionsResult[contador].detalle = detailTransaction
        contador ++
      }
      req.dataLR.infoCuenta.numero_transacciones = trasactionsResult.length
      req.dataLR.infoCuenta.transacciones = trasactionsResult
      let returnObject = {
        error: false,
        total: 1,
        results: req.dataLR.infoCuenta
      }
      return res.status(200).send(returnObject)
    }else{
      let returnObject = {
        error: true,
        message: "La cuenta no existe en el comercio"
      }
      return res.status(400).send(returnObject)
    }
  }catch(err){
    next(err)
  }
})
routes.post('/create', validate, pocosDatos, async(req, res, next) => {
  console.log('Request a account/create')
  try{
    let {body} = req
    console.log(body)
    let correoValido = true
    let celularValido = true
    let validaCorreo = await validaMail(body.account.email)
    let validaCelular = await validaCel(body.account.cel)
    
    let valorEwallet = body.account.ewallet 
    if(valorEwallet === true){ req.dataLR.registro_completo_cuenta = 0 }
    console.log('El valor de registro completo por comercio es: ', req.dataLR.registro_completo_cuenta)
    if(req.dataLR.registro_completo_cuenta === 1){
      console.log('Aplicamos validación completa')
      let returnObject = joiValidate(Joi.validate(body, bodyCreate, {abortEarly: false}))
      if(returnObject.error === true){
        return res.status(400).json(returnObject); 
      }
      if(validaCorreo === false){
        correoValido = false
      }
      if(validaCelular === false){
        celularValido = false
      }
    }else{
      console.log('Aplicamos validación de pocos datos')
      let returnObject = joiValidate(Joi.validate(body, bodyCreateLittleData, {abortEarly: false}))
      if(returnObject.error === true){
        return res.status(400).json(returnObject); 
      }
      if((body.account.email === undefined && body.account.cel === undefined) || (body.account.email === '' && body.account.cel === '') ){
        let returnObject = {
          error: true,
          message: "Es necesario que capture un correo o un teléfono para el registro"
        }
        return res.status(400).send(returnObject)
      }else{
        if(body.account.email !== '' && validaCorreo === false){
          correoValido = false
        }
        if(body.account.cel !== '' && validaCelular === false){
          celularValido = false
        }
      }
    }

    if((correoValido === false && celularValido === true) || (correoValido === true && celularValido === false) || (correoValido === true && celularValido === true)){
      if(correoValido === false && body.account.email !== ''){
        let returnObject = {
          error:true,
          message: 'El Correo capturado ya existe'
        }
        return res.status(400).send(returnObject)
      }
      if(celularValido === false && body.account.cel !== ''){
        let returnObject = {
          error:true,
          message: 'El Número celular capturado ya existe'
        }
        return res.status(400).send(returnObject)
      }

      // si nos envian el numero de la cuenta
      let cupones = []
      // vemos si llegó el numero y la clave:
      let numeroNuevo = ''
      let claveCuenta = ''
      if(body.account.number !== undefined && body.account.number !== ''){
        console.log('Si existe numero de cuenta')
        // Vemos si el numero ya existe:
        let validaUsuario = await User.searchUser({usuario: body.account.number, id_usuario_rol: 5})
        let validaCuenta = await Account.searchAccount({cuenta: body.account.number})
        if(validaUsuario.length === 0 && validaCuenta.length === 0){
          console.log('Cuenta fisica Validada')
          // validamos que sea correcta la contraseña:
          numeroNuevo = body.account.number
          console.log('El nuevo numero es: ', numeroNuevo)
          claveCuenta = await passCuenta(numeroNuevo)

          if(claveCuenta !== body.account.key || body.account.key === '' || body.account.key === undefined){
            let returnObject = {
              error: true,
              message: "La clave ingresada no es correcta"
            }
            return res.status(400).send(returnObject)  
          }
        }else{
          let returnObject = {
            error: true,
            message: "La cuenta ya existe"
          }
          return res.status(400).send(returnObject)
        }
      }else{
        // creamos el numero:
        if(valorEwallet === true){
          numeroNuevo = await crearNumero('monedero')  
        }else{
          numeroNuevo = await crearNumero(req.dataLR.channel)
        }
        claveCuenta = await passCuenta(numeroNuevo)
      }

      // creamos el usuario:
      let infoUsuario = {
        usuario_rol: 5,
        usuario: numeroNuevo,
        pass: claveCuenta,
        nombre: body.account.name,
        apellidos: body.account.lastname,
        email: body.account.email,
        codigo_postal: body.account.zip_code
      }
      let altaUsuario = await User.createUser(infoUsuario)
      console.log('Creamos el usuario')
      // asignamos el id de usuario para la cuenta
      infoUsuario.id_usuario = altaUsuario.insertId
      // Agregamos la info faltante:
      if(body.account.birthday !== undefined && body.account.birthday !== ''){
        let fechaNac = body.account.birthday.split('-')
        infoUsuario.fecha_nac_dia = (fechaNac[2] === 'undefined' || fechaNac[2] === '') ? null : fechaNac[2]
        infoUsuario.fecha_nac_mes = (fechaNac[1] === 'undefined' || fechaNac[1] === '') ? null : fechaNac[1]
        infoUsuario.fecha_nac_ano = (fechaNac[0] === 'undefined' || fechaNac[0] === '') ? null : fechaNac[0]
      }else{
        infoUsuario.fecha_nac_dia = null
        infoUsuario.fecha_nac_mes = null
        infoUsuario.fecha_nac_ano = null
      }
      
      infoUsuario.cuenta = numeroNuevo
      infoUsuario.sexo = (body.account.gender !== undefined && body.account.gender !== '') ? body.account.gender : ( (valorEwallet === true) ? 'w' : null )
      infoUsuario.cel = body.account.cel
      infoUsuario.comercio_registro = req.dataLR.id_comercio
      infoUsuario.campo_abierto = body.account.comments
      
      // registramos la cuenta:
      let altaCuenta = await Account.createAccount(infoUsuario)
      console.log('Creamos la cuenta')
      // lo registramos en sucursal_cuenta
      if(req.dataLR.id_comercio > 0 && valorEwallet === false){
        let comercios = []
        infoUsuario.id_sucursal = req.dataLR.id_sucursal
        let altaSucursalCuenta = await OfficeAccount.createOfficeAccount(infoUsuario)
        console.log('Creamos sucursal cuenta')
        let id_sucursal_cuenta = altaSucursalCuenta.insertId
        // vemos si le corresponde algun beneficio inicial:
        let dataBenefit = {
          id_comercio: req.dataLR.id_comercio,
          beneficio_inicial_cuentas: req.dataLR.beneficio_inicial_cuentas
        }
        let beneficioInicial = await BenefitRegistry.searchMembership(dataBenefit)
        if(beneficioInicial.length > 0){
          //recorremos los beneficios iniciales para asignarlos
          for(let item of beneficioInicial){
            if((item.id_comercio === req.dataLR.id_comercio && item.descartar_cuentas === 1) || (item.id_comercio !== req.dataLR.id_comercio && item.solo_mis_cuentas === 1)){
              // no hacemos nada
            }else{
              if(item.puntos > 0){
                comercios.push(item.comercio)
                let dataTransaction = {
                  id_usuario: null,
                  id_sucursal: req.dataLR.corporativo,
                  cuenta: numeroNuevo,
                  puntos: req.dataLR.round_puntos === 1 ? Math.round(item.puntos) : item.puntos,
                  referencia: 'Beneficio Inicial',
                  concepto: 'Beneficio por registro',
                  total: 0
                }
                let transaction_id = await Transaction.createTransaction(dataTransaction)
                let dataTransactionDetail = {
                  id_transaccion: transaction_id.insertId,
                  id_punto: null,
                  concepto: 'Beneficio por registro',
                  referencia: 'Beneficio inicial',
                  puntos: req.dataLR.round_puntos === 1 ? Math.round(item.puntos) : item.puntos,
                  porcentaje: 1,
                  vigencia: item.vigencia === '' ? null : item.vigencia,
                  total: 0,
                  id_cupon_serie: null 
                }
                await TransactionDetail.createTransactionDetail(dataTransactionDetail)
                console.log('Beneficio de registro')
                // Ahora vemos si el beneficio tiene un cupon:
                if(item.id_cupon !== ''){
                  // Buscamos el cupon: 
                  let infoCupon = asignaCupon(item.id_cupon, req.dataLR.id_comercio)
                  if(infoCupon.error === false){
                    // asignamos el cupon al usuario:
                    let dataAltaCuentaCupon = {
                      serie_id: infoCupon.cupon_serie,
                      cuenta_id: id_sucursal_cuenta, 
                    }
                    await AccountCupon.createAccountCupon(dataAltaCuentaCupon)
                    let cuponAsignado = {
                      nombre: infoCupon.cupon.nombre,
                      comercio: req.dataLR.nom_comercio,
                      puntos: infoCupon.cupon.valor_retorno,
                      codigo: infoCupon.codigo,
                      tipo: infoCupon.cupon.nom_retorno,
                      concepto: infoCupon.cupon.concepto
                    }
                    cupones.push(cuponAsignado)
                  }
                }
              }                
            }
          }
          //termina analisis de los beneficios iniciales
        }
        // Aplicamos beneficio de cumpleaños solo si aplica

        beneficioCumpleRegistro(req.dataLR.id_comercio, req.dataLR.corporativo, numeroNuevo)
        // Actualizamos el saldo al dia:
        // let saldoFinalCuenta = await saldoAhora(numeroNuevo, req.dataLR.id_comercio, '')
        // await actualizaSaldoAhora(numeroNuevo, req.dataLR.id_comercio, saldoFinalCuenta)
      }
      if(body.account.friend !== undefined && body.account.friend !== '' && valorEwallet === false){
        console.log('Tiene cuenta amigo')
        // vemos si tiene una cuenta de amigo:
        let cuentaAmigo = await existeCuenta(body.account.friend)
        console.log('La cuenta del codigo amigo es: ', cuentaAmigo)
        if(cuentaAmigo.error === false){
          Account.updateAccount({id_cuenta: altaCuenta.insertId, cuenta_amigo: cuentaAmigo.result[0].cuenta})
          infoUsuario.cuenta_amigo = cuentaAmigo.result[0].cuenta
          // Proceso de cuenta amigo
          registraCodigoAmigo(1, req.dataLR.id_comercio, req.dataLR.nom_comercio, infoUsuario.cuenta_amigo, numeroNuevo, req.dataLR.corporativo, req.dataLR.round_puntos, req.dataLR.notifica_transaccion)
          //console.log('La respuesta del alta de codigo amigo es: ', altaBeneficioCuentaAmigo)
        }
      }
      // envio de correo
      // Vemos si el comercio tiene correo de bienvenida:
      if(body.account.email !== '' && body.account.email !== 'a@a.a'){
        let comercioCorreoBienvenida = await Merchant.searchMailWelcome(req.dataLR.id_comercio)
        if(comercioCorreoBienvenida[0].mail_bienvenida !== ''){
          //let contenidoCorreo = await correoBienvenida(dataMail)
          let dataEnvia = {
            to: body.account.email,
            from: { name: req.dataLR.nom_comercio, email: 'noreply@loyaltyrefunds.com'},
            subject: `Bienvenido a ${req.dataLR.nom_comercio}`,
            text: `Bienvenido a ${req.dataLR.nom_comercio}`,
            html: comercioCorreoBienvenida[0].mail_bienvenida,
            categoria_sendgrid: `bienvenida_${req.dataLR.id_comercio}` 
          }
          sendEmail(dataEnvia)
        }else{
          let fechaHoy = await hoyTexto()
          let dataMail = {
            fecha: fechaHoy,
            nom_comercio : req.dataLR.nom_comercio,
            nom_sucursal : req.dataLR.nom_sucursal,
            nombre : body.account.name,
            sexo : body.account.gender
          }
          //Armamos el contenido del correo
          let contenidoCorreo = await correoBienvenida(dataMail)
          let dataEnvia = {
            to: body.account.email,
            from: { name: req.dataLR.nom_comercio, email: 'noreply@loyaltyrefunds.com'},
            subject: `Bienvenido a ${req.dataLR.nom_comercio}`,
            text: `Bienvenido a ${req.dataLR.nom_comercio}`,
            html: contenidoCorreo,
            categoria_sendgrid: `bienvenida_${req.dataLR.id_comercio}` 
          }
          sendEmail(dataEnvia)
        }
      }
      // Obtenemos el id de la cuenta que creamos:
      let infoCuenta = await Account.infoAccount({account:infoUsuario.cuenta})
      let returnObject = {
        error:false,
        total: 1,
        result: infoCuenta[0]
      }
      return res.status(200).send(returnObject)
    }else{
      if(correoValido === true && body.account.email !== ''){
        let returnObject = {
          error:true,
          message: 'El Correo capturado ya existe'
        }
        return res.status(400).send(returnObject)
      }
      if(celularValido === true && body.account.cel !== ''){
        let returnObject = {
          error:true,
          message: 'El Número celular capturado ya existe'
        }
        return res.status(400).send(returnObject)
      }
    }

  }catch(err){
    return next(err)
  }
})
routes.post('/add_in_merchant', validate, async(req, res, next) =>{
  console.log('Request a account/add_in_merchant')
  try{
    // validamos el header:
    const {body} = req
    let validate = await Joi.validate(body, bodyAddInMerchant)
    // validamos la cuenta
    let revisaCuenta = await existeCuenta(body.account.account)
    // Si la cuenta existe seguimos
    if(revisaCuenta.error === false){
      // vemos si existe en la sucursal del apikey:
      let dataExisteEnSucursal = {
        cuenta: revisaCuenta.result[0].cuenta,
        id_sucursal: req.dataLR.id_sucursal
      }
      let existeEnSucursal = await OfficeAccount.searchOfficAccountSimple(dataExisteEnSucursal)
      if(existeEnSucursal.length > 0){
        let returnObject = {
          error: false,
          results: revisaCuenta.result[0]
        }
        return returnObject
      }else{
        // lo registramos en la sucursal:
        let dataAltaSucursal = {
          id_sucursal:req.dataLR.id_sucursal,
          cuenta: revisaCuenta.result[0].cuenta,
          campo_abierto: body.account.comments
        }
        let altaSucursal = await OfficeAccount.addOfficeAccount(dataAltaSucursal)
        let returnObject = {
          error: false,
          results: revisaCuenta.result[0]
        }
        return returnObject
      }
    }else{
      return res.status(400).send(revisaCuenta)
    }
  }catch(err){
    next(err)
  }
})
routes.put('/update', validate, validateAccount, async(req, res, next) => {
  console.log('Request a account/update')
  try{
    // validamos el header:
    const {body} = req
    console.log('Datos para actualizar cuenta: ', body)
    await Joi.validate(body, bodyUpdate)
    // vemos si existe la cuenta en el comercio
    if(req.dataLR.existe_comercio === true){
      let mailValidado = true
      let celValidado = true
      // vemos si se envio el correo lo validamos:
      if(body.account.email !== undefined && body.account.email !== req.dataLR.infoCuenta.email){
        let validaEmail = await validaMail(body.account.email)
        if(validaEmail === false){
          mailValidado = false
        }
      }
      if(body.account.cel !== undefined && body.account.cel !== req.dataLR.infoCuenta.cel){
        let validaCelular = await validaCel(body.account.cel)
        if(validaCelular === false){
          celValidado = false
        }
      }
      if(mailValidado === false){
        let returnObject = {
          error: true,
          message: "El email ingresado ya existe"
        }
        return res.status(400).send(returnObject)
      }else{
        if(celValidado === false){
          let returnObject = {
            error: true,
            message: "El numero celular ingresado ya existe"
          }
          return res.status(400).send(returnObject)
        }else{
          let dataUsuario = await User.searchUser({usuario: req.dataLR.infoCuenta.cuenta, id_usuario_rol: 5})
          if(dataUsuario.length === 0){
            return res.status(400).send({error:true, message: 'El usuario no existe'})
          }
          let infoUsuario = {
            id_usuario : dataUsuario[0].id_usuario
          }
          if(body.account.email !== undefined) infoUsuario.email = body.account.email
          if(body.account.name !== undefined) infoUsuario.nombre = body.account.name
          if(body.account.lastname !== undefined) infoUsuario.apellidos = body.account.lastname
          if(body.account.zip_code !== undefined) infoUsuario.codigo_postal = body.account.zip_code
          // actualizamos en usuario:
          console.log('Actualizamos el usuario')
          await User.updateUser(infoUsuario)
          
          if(body.account.cel !== undefined) infoUsuario.cel = body.account.cel
          if(body.account.birthday !== undefined){
            let dataCumple = body.account.birthday.split('-')
            infoUsuario.fecha_nac_dia = dataCumple[2]
            infoUsuario.fecha_nac_mes = dataCumple[1]
            infoUsuario.fecha_nac_ano = dataCumple[0]
          }
          if(body.account.gender !== undefined) infoUsuario.sexo = body.account.gender
          if(body.account.comments !== undefined) infoUsuario.campo_abierto = body.account.comments
          let dataCuenta = await Account.searchAccount({cuenta: req.dataLR.infoCuenta.cuenta, id_usuario: infoUsuario.id_usuario})
          infoUsuario.id_cuenta = dataCuenta[0].id_cuenta
          // actualizamos en cuenta:
          console.log('Actualizamos la cuenta')
          await Account.updateAccount(infoUsuario)
          // actualizamos en sucursal_cuenta:   
          // Buscamos todas las sucursales del usuario:
          let sucursalesUsuario = await OfficeAccount.searchOfficAccountSimple({cuenta: req.dataLR.infoCuenta.cuenta})
          for(let item of sucursalesUsuario){
            infoUsuario.id_sucursal_cuenta = item.id_sucursal_cuenta
            if(item.cuenta === req.dataLR.infoCuenta.cuenta){
              OfficeAccount.updateOfficeAccount(infoUsuario)
            }
          }
          // volvemos a consultar los datos de la cuenta:
          let nuevaInfo = await Account.infoAccount({account:req.dataLR.infoCuenta.cuenta})
          let returnObject = {
            error: false,
            total: 1,
            result: nuevaInfo
          }
          return res.status(200).send(returnObject)
        }
      }
    }else{
      let returnObject = {
        error: true,
        message: "La cuenta no existe en el comercio"
      }
      return res.status(400).send(returnObject)
    }
  }catch(err){
    next(err)
  }
})
routes.post('/coupons', validate, validateAccount, async(req, res, next) => {
  console.log('Request a account/coupons')
  try{
    // validamos el header:
    const {body} = req
    await Joi.validate(body, bodyAccountDetail)
    // vemos si existe la cuenta en el comercio
    if(req.dataLR.existe_comercio === true){
      // Obtenemos los cupones asignados a la cuenta:
      let cuponesCuenta = await Cupon.searchAcountCupon(req.dataLR.id_comercio, req.dataLR.infoCuenta.cuenta, false)
      req.dataLR.infoCuenta.total_cupones = cuponesCuenta.length
      req.dataLR.infoCuenta.cupones = cuponesCuenta 

      let returnObject = {
        error: false,
        total: 1,
        results: req.dataLR.infoCuenta
      }
      return res.status(200).send(returnObject)
    }else{
      let returnObject = {
        error: true,
        message: "La cuenta no existe en el comercio"
      }
      return res.status(400).send(returnObject)
    }
  }catch(err){
    next(err)
  }
})
//multer.single('attachment')
routes.post('/upload', multer.single('attachment'), validate, async(req, res, next) => {
  console.log('Request a account/upload')
  try{
    let archivo = req.file
    console.log(archivo)
    let erroneos = []
    let fileExtension = archivo.originalname.split('.')
    if((archivo.mimetype === 'text/csv' || archivo.mimetype === 'application/vnd.ms-excel') && (fileExtension[1].toLowerCase() === 'csv')){
      let parser = parse({delimiter: ','}, async(err, data) => {
        if(data === undefined){
          let returnObject = {
            error: true,
            message: "El archivo tiene un formato no valido"
          }
          return res.status(400).send(returnObject)
        }
        //vemos si trae el numero de campos necesarios:
        let contador = 0
        for(let info of data){
          console.log('Validando Reg:', contador)
          if(contador > 0){
            let dataValida = await validaLineaBachCuenta(info, req.dataLR.requiere_clave)
            // ########################################################################
            // Registramos la cuenta
            if(dataValida.error === false){
              // Estas son un alta:
              if(info[12] === 'ND' || info[12] === 'NF' || info[12] === 'MON'){
                // Creamos la cuenta:
                let numeroNuevo = ''
                let claveCuenta = ''
                // Asignamos cuenta y clave
                if(info[10] !== ''){
                  numeroNuevo = info[10]
                  claveCuenta = info[11]
                }else{
                  if(info[12] === 'MON'){
                    numeroNuevo = await crearNumero('monedero')  
                  }else{
                    numeroNuevo = await crearNumero(req.dataLR.channel)
                  }
                  claveCuenta = await passCuenta(numeroNuevo)
                }
                // creamos el usuario:
                let infoUsuario = {
                  usuario_rol: 5,
                  usuario: numeroNuevo,
                  pass: claveCuenta,
                  nombre: info[0],
                  apellidos: info[1],
                  email: info[2],
                  codigo_postal: info[6]
                }
                let altaUsuario = await User.createUser(infoUsuario)
                console.log('Creamos el usuario')
                // asignamos el id de usuario para la cuenta
                infoUsuario.id_usuario = altaUsuario.insertId
                infoUsuario.fecha_nac_dia = info[3] !== '' ? info[3] : null
                infoUsuario.fecha_nac_mes = info[4] !== '' ? info[4] : null
                infoUsuario.fecha_nac_ano = info[5] !== '' ? info[5] : null
                infoUsuario.cuenta = numeroNuevo
                infoUsuario.sexo = (info[7] === '') ? ( (info[12] === 'M') ? 'w' : null ) : info[7].toLowerCase()
                infoUsuario.cel = info[8]
                infoUsuario.comercio_registro = req.dataLR.id_comercio // comercio_registro
                infoUsuario.campo_abierto = info[9]
                // registramos la cuenta:

                let altaCuenta = await Account.createAccount(infoUsuario)
                // Si no es monedero registramos en sucursal cuenta:
                if(req.dataLR.id_comercio > 0 && info[12] !== 'MON'){
                  let comercios = []
                  infoUsuario.id_sucursal = req.dataLR.id_sucursal
                  let altaSucursalCuenta = await OfficeAccount.createOfficeAccount(infoUsuario)
                  console.log('Creamos sucursal cuenta')
                  let id_sucursal_cuenta = altaSucursalCuenta.insertId
                  // vemos si le corresponde algun beneficio inicial:
                  let dataBenefit = {
                    id_comercio: req.dataLR.id_comercio,
                    beneficio_inicial_cuentas: req.dataLR.beneficio_inicial_cuentas
                  }
                  let beneficioInicial = await BenefitRegistry.searchMembership(dataBenefit)
                  if(beneficioInicial.length > 0){
                    //recorremos los beneficios iniciales para asignarlos
                    for(let item of beneficioInicial){
                      if((item.id_comercio === req.dataLR.id_comercio && item.descartar_cuentas === 1) || (item.id_comercio !== req.dataLR.id_comercio && item.solo_mis_cuentas === 1)){
                        // No hacemos nada
                      }else{
                        if(item.puntos > 0){
                          comercios.push(item.comercio)
                          let dataTransaction = {
                            id_usuario: null,
                            id_sucursal: req.dataLR.corporativo,
                            cuenta: numeroNuevo,
                            puntos: req.dataLR.round_puntos === 1 ? Math.round(item.puntos) : item.puntos,
                            referencia: 'Beneficio Inicial',
                            concepto: 'Beneficio por registro',
                            total: 0
                          }
                          let transaction_id = await Transaction.createTransaction(dataTransaction)
                          let dataTransactionDetail = {
                            id_transaccion: transaction_id.insertId,
                            id_punto: null,
                            concepto: 'Beneficio por registro',
                            referencia: 'Beneficio inicial',
                            puntos: req.dataLR.round_puntos === 1 ? Math.round(item.puntos) : item.puntos,
                            porcentaje: 1,
                            vigencia: item.vigencia === '' ? null : item.vigencia,
                            total: 0,
                            id_cupon_serie: null 
                          }
                          await TransactionDetail.createTransactionDetail(dataTransactionDetail)
                          console.log('Beneficio de registro')
                          // Ahora vemos si el beneficio tiene un cupon:
                          if(item.id_cupon !== ''){
                            // Buscamos el cupon: 
                            let infoCupon = asignaCupon(item.id_cupon, req.dataLR.id_comercio)
                            if(infoCupon.error === false){
                              // asignamos el cupon al usuario:
                              let dataAltaCuentaCupon = {
                                serie_id: infoCupon.cupon_serie,
                                cuenta_id: id_sucursal_cuenta, 
                              }
                              await AccountCupon.createAccountCupon(dataAltaCuentaCupon)
                              let cuponAsignado = {
                                nombre: infoCupon.cupon.nombre,
                                comercio: req.dataLR.nom_comercio,
                                puntos: infoCupon.cupon.valor_retorno,
                                codigo: infoCupon.codigo,
                                tipo: infoCupon.cupon.nom_retorno,
                                concepto: infoCupon.cupon.concepto
                              }
                              cupones.push(cuponAsignado)
                            }
                          }
        
                        }                
                      }
                    }
                    //termina analisis de los beneficios iniciales
                  }
                  // Aplicamos beneficio de cumpleaños solo si aplica
                  await beneficioCumpleRegistro(req.dataLR.id_comercio, req.dataLR.corporativo, numeroNuevo)
                  // Actualizamos el saldo al dia:
                  let saldoFinalCuenta = await saldoAhora(numeroNuevo, req.dataLR.id_comercio, '')
                  await actualizaSaldoAhora(numeroNuevo, req.dataLR.id_comercio, saldoFinalCuenta)
                }
                // Código amigo
                if(info[13] !== undefined && info[13] !== '' && info[12] !== 'MON'){
                  console.log('Tiene cuenta amigo')
                  // vemos si tiene una cuenta de amigo:
                  let cuentaAmigo = await existeCuenta(info[13])
                  if(cuentaAmigo.error === false){
                    await Account.updateAccount({id_cuenta: altaCuenta.insertId, cuenta_amigo: cuentaAmigo.result[0].cuenta})
                    infoUsuario.cuenta_amigo = cuentaAmigo.result[0].cuenta
                    // Proceso de cuenta amigo
                    let altaBeneficioCuentaAmigo = await registraCodigoAmigo(1, req.dataLR.id_comercio, req.dataLR.nom_comercio, infoUsuario.cuenta_amigo, numeroNuevo, req.dataLR.corporativo, req.dataLR.round_puntos, req.dataLR.notifica_transaccion)
                    console.log(`El resultado del codigo amigo en registro fue: ${altaBeneficioCuentaAmigo}`)
                  }
                }
                // envio de correo
                // Vemos si el comercio tiene correo de bienvenida:
                if(info[2] !== '' && info[2] !== 'a@a.a'){
                  let comercioCorreoBienvenida = await Merchant.searchMailWelcome(req.dataLR.id_comercio)
                  if(comercioCorreoBienvenida[0].mail_bienvenida !== ''){
                    //let contenidoCorreo = await correoBienvenida(dataMail)
                    let dataEnvia = {
                      to: info[2],
                      from: { name: req.dataLR.nom_comercio, email: 'noreply@loyaltyrefunds.com'},
                      subject: `Bienvenido a ${req.dataLR.nom_comercio}`,
                      text: `Bienvenido a ${req.dataLR.nom_comercio}`,
                      html: comercioCorreoBienvenida[0].mail_bienvenida,
                      categoria_sendgrid: `bienvenida_${req.dataLR.id_comercio}` 
                    }
                    await sendEmail(dataEnvia)
                  }else{
                    let fechaHoy = await hoyTexto()
                    let dataMail = {
                      fecha: fechaHoy,
                      nom_comercio : req.dataLR.nom_comercio,
                      nom_sucursal : req.dataLR.nom_sucursal,
                      nombre : info[0],
                      sexo : info[7]
                    }
                    //Armamos el contenido del correo
                    let contenidoCorreo = await correoBienvenida(dataMail)
                    let dataEnvia = {
                      to: info[2],
                      from: { name: req.dataLR.nom_comercio, email: 'noreply@loyaltyrefunds.com'},
                      subject: `Bienvenido a ${req.dataLR.nom_comercio}`,
                      text: `Bienvenido a ${req.dataLR.nom_comercio}`,
                      html: contenidoCorreo,
                      categoria_sendgrid: `bienvenida_${req.dataLR.id_comercio}` 
                    }
                    await sendEmail(dataEnvia)
                  }
                }
              }else if(info[12] === 'M'){
                // Obtenemos el id del usuario:
                let infoCuenta = await Account.searchAccount({cuenta: info[10]}, false)
                // Esto es para actualizar cuentas:
                let dataUsuario = {
                  id_usuario: infoCuenta[0].id_usuario,
                  nombre: info[0] !== '' ? info[0] : null ,
                  apellidos: info[1] !== '' ? info[1] : null ,
                  email: info[2],
                  codigo_postal: info[6]
                }
                await User.updateUser(dataUsuario)
                infoUsuario.id_cuenta = infoCuenta[0].id_cuenta
                infoUsuario.fecha_nac_dia = info[3]
                infoUsuario.fecha_nac_mes = info[4]
                infoUsuario.fecha_nac_ano = info[5]
                infoUsuario.sexo = (info[7] === '') ? ( (info[12] === 'M') ? 'w' : null ) : info[7].toLowerCase()
                infoUsuario.cel = info[8]
                infoUsuario.campo_abierto = info[9]
                await Account.updateAccount(infoUsuario)
                let infoSucursalCuenta = await OfficeAccount.searchOfficAccount({cuenta: info[10]})
                if(infoSucursalCuenta.length > 0){
                  for(let item of infoSucursalCuenta){
                    infoUsuario.id_sucursal_cuenta = item.id_sucursal_cuenta
                    await OfficeAccount.updateOfficeAccount(infoUsuario)
                  }
                }
              }else if(info[12] === 'E'){
                // Eliminamos el registro de la sucursal:
                let infoSucursalCuenta = await OfficeAccount.searchOfficAccount({cuenta: info[10], id_sucursal: req.dataLR.id_sucursal_cuenta})
                await OfficeAccount.deleteOfficeAccount({id_sucursal_cuenta: infoSucursalCuenta[0].id_sucursal_cuenta, cuenta: info[10]})
              }
            }else{
              info[1] = (info[1] !== '' || info[1] !== undefined) ? info[1] : ''
              info[2] = (info[2] !== '' || info[2] !== undefined) ? info[2] : ''
              info[3] = (info[3] !== '' || info[3] !== undefined) ? info[3] : ''
              info[4] = (info[4] !== '' || info[4] !== undefined) ? info[4] : ''
              info[5] = (info[5] !== '' || info[5] !== undefined) ? info[5] : ''
              info[6] = (info[6] !== '' || info[6] !== undefined) ? info[6] : ''
              info[7] = (info[7] !== '' || info[7] !== undefined) ? info[7] : ''
              info[8] = (info[8] !== '' || info[8] !== undefined) ? info[8] : ''
              info[9] = (info[9] !== '' || info[9] !== undefined) ? info[9] : ''
              info[10] = (info[10] !== '' || info[10] !== undefined) ? info[10] : ''
              info[11] = (info[11] !== '' || info[11] !== undefined) ? info[11] : ''
              info[12] = (info[12] !== '' || info[12] !== undefined) ? info[12] : ''
              info[13] = (info[13] !== '' || info[13] !== undefined) ? info[13] : ''
              info[14] = dataValida.message
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
      fs.unlinkSync(archivo.path)
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
  console.log('Request a account/error_file')
  try{
    // vemos si existe el archivo:
    let file = path.join('public/', req.params.file)
    console.log(file)
    let archivoValido = false
    if(fs.accessSync(file)) {
      archivoValido = true
    }
    console.log('aqui')
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
routes.post('/validaSaldos', async (req, res, next) =>{
  console.log('Request a account/validaSaldos')
  try{
    // Parametros
    // #########################################################
    let dataBusqueda = ['938420254','5244258815','5244258815']
    let comercio = 89
    // #########################################################

    let fechaSaldo = await hoyTexto()
    let respuesta = []
    for(let item of dataBusqueda){
      let saldoResult = await consultaSaldo(item, comercio, fechaSaldo)
      respuesta.push({cuenta: item, saldo: saldoResult})
    }
    let returnObject = {
      error: false,
      total: dataBusqueda.length,
      result: respuesta
    }
    return res.status(200).send(returnObject)
  }catch(err){
    return next(err)
  }
})
routes.post('/verifica_clave', async(req, res, next) => {
  console.log('Request a verificación de clave')
  try{
    let {body} = req
    await Joi.validate(body, bodyValidaClave)
    let clave = await validaPassword(body.conditions.account)
    let returnObject ={
      error: false,
      account: body.conditions.account,
      password: clave
    }
    return res.status(200).send(returnObject)
  }catch(err){
    return next(err)
  }
})
// Falta enviar mail para validar una cuenta
routes.post('/arregla_cuentas', multer.single('attachment'), async(req, res, next) => {
  console.log('Request a account/arregla_cuentas')
  req.setTimeout(0)
  try{
    let archivo = req.file
    let cuentasCuenta = []
    let cuentasUsuario = []
    let erroneos = []
    let procesado = 0
    let parser = parse({delimiter: ','}, async(err, data) => {
      if(data === undefined){
        let returnObject = {
          error: true,
          message: "El archivo tiene un formato no valido"
        }
        return res.status(400).send(returnObject)
      }
      //vemos si trae el numero de campos necesarios:
      let contador = 0
      let cuentaActual = ''
      for(let item of data){
        if(cuentaActual !== item[0]){
          // primero vemos si existe la cuenta en usuario:
          let validaUsuario = await User.validaUsuario(item[0], item[3])
          if(validaUsuario.length === 0){
            // validamos en la tabla de cuenta:
            let validaCuenta = await Account.validaCuenta(item[0], item[3], item[9])
            if(validaCuenta.length === 0){
              console.log('Validado: ', item[0])
              // Comenzamos a insertar usuario:
              let claveCuenta = await passCuenta(item[0])
              let dataInsert = {
                usuario_rol: 5,
                usuario: item[0],
                pass: claveCuenta,
                nombre: item[1],
                apellidos: item[2],
                email: item[3],
                codigo_postal: item[7]
              }
              let altaUsuario = await User.createUser(dataInsert)
              dataInsert.id_usuario = altaUsuario.insertId
              dataInsert.numero = cuenta
              dataInsert.fecha_nac_dia = item[4]
              dataInsert.fecha_nac_mes = item[5]
              dataInsert.fecha_nac_ano = item[6]
              dataInsert.sexo = item[10]
              dataInsert.cel = item[9]
              //Vemos cual fue su primer comercio:
              let primerComercio = await OfficeAccount.dateStartMerchant({cuenta})
              dataInsert.comercio_registro = primerComercio[0].id_comercio
              await Account.createAccount(dataInsert)
              procesado++
            }else{
              console.log('La cuenta Existe', item[0])
              cuentasCuenta.push(item[0])
            }
          }else{
            console.log('El usuario existe', item[0])
            cuentasUsuario.push(item[0])
          }
        }
        cuentaActual = item[0]
      }

      let returnObject = {
        cuentas: cuentasCuenta,
        usuarios: cuentasUsuario,
        procesados: procesado
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
    fs.unlinkSync(archivo.path)

  }catch(err){
    return next(err)
  }
})

module.exports = routes