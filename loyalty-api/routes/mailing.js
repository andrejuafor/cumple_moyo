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
//const csv = require('csv-parser');
const Json2csvParser = require('json2csv').Parser
const moment = require('moment')


const {Mailing, MailingTo, ListaNegra, Cupon, Account} = require('loyalty-db')
const {validate, validMailingTo} = require('../middlewares/middleware')
const {existeCuenta} = require('../lib/account')
const {uploadAzure} = require('../lib/azure')

function emailValido(email) {
  var re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
  return re.test(String(email).toLowerCase());
}

const routes = asyncify(express.Router())

const bodySearch = Joi.object().keys({
  conditions: Joi.object().keys({
    id: Joi.number(),
    name: Joi.string().allow(['',' ']),
    send_date: Joi.string().allow(['', ' ']),
    page_ini: Joi.number().allow(['']),
    page_end: Joi.number().allow(['']),
    export_file: Joi.any().valid([true, false]).required()
  }).required()
})
const bodyDetail = Joi.object().keys({
  conditions:Joi.object().keys({
    id: Joi.number().required()
  }).required()
})
const bodySenders = Joi.object().keys({
  conditions:Joi.object().keys({
    id: Joi.number().required(),
    email: Joi.string().email().allow(['']),
    account: Joi.string().allow(['']),
    name: Joi.string().allow(['']),
    page_ini: Joi.number().allow(['']),
    page_end: Joi.number().allow(['']),
    export_file: Joi.any().valid([true, false]).required()
  }).required()
})
const bodyCreate = Joi.object().keys({
  mailing: Joi.object().keys({
    name: Joi.string().required(),
    date_send: Joi.string().required(),
    hour_send: Joi.string().required(),
    title: Joi.string().required(),
    observations: Joi.string().allow(['',' ']),
    coupon: Joi.number(),
    html: Joi.string().required(),
    file: Joi.array(),
  }).required()
})

const bodyUpdate = Joi.object().keys({
  mailing: Joi.object().keys({
    id_mailing: Joi.number().required(),
    name: Joi.string().allow(['']),
    date_send: Joi.string().allow(['']),
    hour_send: Joi.string().allow(['']),
    title: Joi.string().allow(['']),
    observations: Joi.string().allow(['',' ']),
    coupon: Joi.number(),
    html: Joi.string().allow(['']),
    file: Joi.array(),
  }).required()
})

const bodyAddSendersOffice = Joi.object().keys({
  senders:Joi.object().keys({
    id_mailing: Joi.number().required(),
    allAcounts: Joi.any().valid([true, false]),
    office: Joi.array()
  }).required()
})
const bodyAddSendersAccounts = Joi.object().keys({
  senders:Joi.object().keys({
    id_mailing: Joi.number().required(),
    accounts: Joi.array().min(1).required()
  }).required()
})
const bodyAddSendersEmail = Joi.object().keys({
  senders:Joi.object().keys({
    id_mailing: Joi.number().required(),
    emails: Joi.array().min(1).required()
  }).required()
})

const bodyUploadImage = Joi.object().keys({
  mailing: Joi.object().keys({
    image: Joi.string().required()
  })
})

const bodyDeleteSenders = Joi.object().keys({
  senders:Joi.object().keys({
    id_mailing: Joi.number().required(),
    email: Joi.string().allow(['']),
    account: Joi.string().allow([''])
  }).required()
})

const bodyUpdateStats = Joi.object().keys({
  mailing:Joi.object().keys({
    id_mailing: Joi.number().required()
  }).required()
})

routes.post('/search', validate, async(req, res, next) => {
  console.log('Request a mailing/search')
  try{
    const {body} =  req
    await Joi.validate(body, bodySearch)
    body.conditions.id_mailing = (body.conditions.id === 0 || body.conditions.id === undefined) ? '' : body.conditions.id
    body.conditions.id_comercio = req.dataLR.id_comercio

    if(body.conditions.export_file === true){
      let results = await Mailing.searchMailingReport(body.conditions)
      let dt = new Date()
      let month = dt.getMonth()+1
      let day = dt.getDate()
      let year = dt.getFullYear()
      let hour = dt.getHours()
      let minute = dt.getMinutes()
      let nombreArchivo = `rep_camp_mailing_${month}${day}${year}_${hour}${minute}.csv`
      let file = path.join('public/', nombreArchivo)
      // Generamos el archivo
      const fields = ['id_mailing','fecha_envio','hora_envio','nombre','observaciones','id_cupon', 'nombreCupon','enviosLR','enviados','invalidos','abiertos','solicitados','rechazados','abiertosUnicos','spam', 'clicks','clicksUnicos']
      const json2csvParser = new Json2csvParser({ fields });
      let datosCsv = json2csvParser.parse(results);
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
      let results = await Mailing.searchMailing(body.conditions, true)
      let totalResults = await Mailing.searchMailing(body.conditions, false)
      
      let returnObject = {
        error:false,
        total: totalResults[0].total,
        results: results
      }
      return res.status(200).send(returnObject)
    }
  }catch(err){
    return next(err)
  }
})
routes.post('/detail', validate, async(req, res, next) => {
  console.log('Request a mailing/detail')
  try{
    const {body} =  req
    await Joi.validate(body, bodyDetail)
    body.conditions.id_mailing = body.conditions.id
    body.conditions.id_comercio = req.dataLR.id_comercio
    let results = await Mailing.detailMailing(body.conditions)
    
    if(results.length > 0){
      // Vemos si tiene archivos adjuntos:
      let archivos = await Mailing.fileMailing(body.conditions)
      results[0].files = archivos
      // Vemos si tiene cupon:
      if(results[0].id_cupon !== '' && results[0].id_cupon !== null){
        let infoCupon = await Cupon.searchById(results[0].id_cupon, req.dataLR.id_comercio)
        results[0].cupon = [{
                          id_cupon: infoCupon[0].id_cupon,
                          cupon: infoCupon[0].nombre, 
                          vigencia: infoCupon[0].vig === '0000-00-00' ? 'Sin vigencia' : infoCupon[0].vigencia,
                          retorno: infoCupon[0].tipo_retorno === 'informativo' ? infoCupon[0].concepto : `${infoCupon[0].valor_retorno} en ${infoCupon[0].nom_retorno}` 
                        }]
      }else{
        results[0].cupon = []
      }
    }

    let returnObject = {
      error:false,
      total: results.length,
      results: results
    }
    return res.status(200).send(returnObject)
  }catch(err){
    return next(err)
  }
})
routes.post('/senders', validate, async(req, res, next) => {
  console.log('Request a mailing/senders')
  try{
    const {body} = req
    await Joi.validate(body, bodySenders)
    body.conditions.id_mailing = body.conditions.id
    
    let results = await MailingTo.searchMailingTo(body.conditions, true)
    let totalResults = await MailingTo.searchMailingTo(body.conditions, false)
    let returnObject = {
      error: false,
      total: totalResults[0].total,
      results: results
    }
    return res.status(200).send(returnObject)
  }catch(err){
    return next(err)
  }
})
routes.post('/create', validate, async(req, res, next) =>{
  console.log('Request a mailing/create')
  try{
    const {body} = req
    await Joi.validate(body, bodyCreate)
    // Validamos la fecha y la hora
    let ahora = new Date()
    let enviada = new Date(`${body.mailing.date_send} ${body.mailing.hour_send}`)
    if(enviada <= ahora) return res.status(500).send({error: true, message: 'La fecha y hora de envio no son válidos.'}) 

    if(body.mailing.coupon !== undefined && body.mailing.coupon !== ''){
      let existeCupon = await Cupon.searchById(body.mailing.coupon, req.dataLR.id_comercio)
      if(existeCupon.length === 0) return res.status(400).send({error: true, message: 'Debe enviar una campaña de cupón valida'})
    }

    body.mailing.id_usuario = req.dataLR.id_usuario
    body.mailing.id_comercio = req.dataLR.id_comercio
    let dataIsert = await Mailing.insertMailing(body.mailing)
    let returnObject = {
      error: false,
      message: "Mailing creado correctamente",
      mailing_id: dataIsert.insertId
    }
    return res.status(200).send(returnObject)
  }catch(err){
    return next(err)
  }
})
routes.post('/update', validate, async(req, res, next) =>{
  console.log('Request a mailing/update')
  try{
    const {body} = req
    await Joi.validate(body, bodyUpdate)

    let existeMailing = await Mailing.searchMailing({id_mailing: body.mailing.id_mailing}, true)
    if(existeMailing.length === 0){
      return res.status(400).send({error: true, message: 'Debe enviar una campaña de mailing valida'})
    }
    let dataUpdate = {
      id_mailing: body.mailing.id_mailing
    }
    let ahora = new Date()
    let fechaEnvio = new Date(`${existeMailing[0].fecha_envio} ${existeMailing[0].hora_envio}`)
    if(fechaEnvio <= ahora){
      return res.status(400).send({error: true, message: 'Esta capaña ya fue enviada, no puede ser modificada'})
    }

    if(body.mailing.date_send !== undefined && body.mailing.date_send !== ''){      
      if(body.mailing.hour_send !== undefined && body.mailing.hour_send !== ''){
        let enviada = new Date(`${body.mailing.date_send} ${body.mailing.hour_send}`)  
        if(enviada <= ahora) return res.status(400).send({error: true, message: 'La fecha y hora de envio no son válidos.'})

        dataUpdate.hour_send = body.mailing.hour_send
        dataUpdate.date_send = body.mailing.date_send
      }else{
        let enviada = new Date(`${body.mailing.date_send} ${existeMailing[0].hora_envio}`)  
        if(enviada <= ahora) return res.status(400).send({error: true, message: 'La fecha y hora de envio no son válidos.'})    

        dataUpdate.date_send = body.mailing.date_send
      }
    }

    if(body.mailing.coupon !== undefined && body.mailing.coupon !== ''){
      let existeCupon = await Cupon.searchById(body.mailing.coupon, req.dataLR.id_comercio)
      if(existeCupon.length === 0) return res.status(400).send({error: true, message: 'Debe enviar una campaña de cupón valida'})
    }

    if(body.mailing.name !== undefined && body.mailing.name !== '') dataUpdate.name = body.mailing.name
    if(body.mailing.title !== undefined && body.mailing.title !== '') dataUpdate.title = body.mailing.title
    if(body.mailing.observations !== undefined && body.mailing.observations !== '') dataUpdate.observations = body.mailing.observations
    if(body.mailing.coupon !== undefined && body.mailing.coupon !== '') dataUpdate.coupon = body.mailing.coupon
    if(body.mailing.html !== undefined && body.mailing.html !== '') dataUpdate.html = body.mailing.html

    
    let dataIsert = await Mailing.updateMailing(dataUpdate)
    let returnObject = {
      error: false,
      message: "Mailing actualizado correctamente"
    }
    return res.status(200).send(returnObject)
  }catch(err){
    return next(err)
  }
})
routes.post('/add_senders_office', validMailingTo, validate, async(req, res, next) => {
  console.log('Request a mailing/add_senders_office')
  try{
    const {body} = req
    await Joi.validate(body, bodyAddSendersOffice)
    // Primero vemos cuantas cuentas tiene ya ingresadas:
    let cuentasIngresadas = await MailingTo.totalAccountsMailingTo(body.senders.id_mailing)
    // Vemos cuantas cuentas existen
    let totalCuentas = await Account.totalAccounts(req.dataLR.id_comercio)
    // Vemos el porcentaje
    let porcentaje = ((cuentasIngresadas[0].total * 100) / totalCuentas[0].total )
    if(porcentaje >= 60){
      let returnObject = {
          error: true, 
          message: 'Para seleccionar esta opción debe tener menos del 60% de cuentas ingresadas.',
          remitentes: cuentasIngresadas[0].total
        }
      return res.status(400).send(returnObject)
    }

    // Vemos si ya hay registros en la tabla:
    if(body.senders.allAcounts === true){
      await MailingTo.insertAllAccounts(body.senders.id_mailing, req.dataLR.id_comercio)
    }else{
      if(body.senders.office.length > 0){
        await MailingTo.insertOfficeAccounts(body.senders.id_mailing, body.senders.office)
      }
    }
    // consultamos el numero de destinatarios:
    let dataSenders = await MailingTo.searchMailingTo({ id_mailing: body.senders.id_mailing }, false)
    MailingTo.removeEmailListaNegra(body.senders.id_mailing)
    MailingTo.removeAccountListaNegra(body.senders.id_mailing)

    let returnObject = {
      error: false,
      message: "Remitentes ingresados correctamente",
      remitentes: dataSenders[0].total
    }
    return res.status(200).send(returnObject)
  }catch(err){
    return next(err)
  }
})
routes.post('/add_senders_account', validMailingTo, validate, async(req, res, next) => {
  console.log('Request a mailing/add_senders_account')
  try{
    const {body} = req
    await Joi.validate(body, bodyAddSendersAccounts)
    let cuentas = ''
    let infoCuentas = body.senders.accounts
    for(let item = 0; item < infoCuentas.length; item++){
      if(item === (infoCuentas.length - 1)){
        cuentas+=`'${infoCuentas[item]}'`
      }else{
        cuentas+=`'${infoCuentas[item]}',`
      }
    }

    await MailingTo.insertAccountsMailingTo(cuentas, body.senders.id_mailing, req.dataLR.id_comercio)
    let dataSenders = await MailingTo.searchMailingTo({ id_mailing: body.senders.id_mailing }, false)
    
    MailingTo.removeEmailListaNegra(body.senders.id_mailing)
    MailingTo.removeAccountListaNegra(body.senders.id_mailing)

    let returnObject = {
      error: false,
      message: "Remitentes ingresados correctamente",
      remitentes: dataSenders[0].total
    }
    return res.status(200).send(returnObject)
    
  }catch(err){
    return next(err)
  }
})
routes.post('/add_senders_email', validMailingTo, validate, async(req, res, next) => {
  console.log('Request a mailing/add_senders_email')
  try{
    const {body} = req
    await Joi.validate(body, bodyAddSendersEmail)
    for(let item of body.senders.emails){
      item = item.toLowerCase()
      item = item.trim()
      item =  item.replace(/ /g,'');
      if(emailValido(item)){
        // vemos si no está en lista negra:
        let validaListaNegra = await ListaNegra.searchListaNegra({id_comercio: req.dataLR.id_comercio, email: item})
        if(validaListaNegra.length === 0){
          // vemos si el mail no está ya en los correos:
          let validaMail = await MailingTo.searchMailingTo({id_mailing: body.senders.id_mailing, email: item})
          if(validaMail[0].total === 0){
            await MailingTo.insertSingleMailingTo({id_mailing: body.senders.id_mailing, email: item, nombre: '', cuenta: ''})
          }
        }
      }
    }
    let dataSenders = await MailingTo.searchMailingTo({ id_mailing: body.senders.id_mailing }, false)
    let returnObject = {
      error: false,
      message: "Remitentes ingresados correctamente",
      remitentes: dataSenders[0].total
    }
    return res.status(200).send(returnObject)
  }catch(err){
    return next(err)
  }
})
routes.post('/add_senders_email_upload', multer.single('attachment'), validate, async(req, res, next) => {
  console.log('Request a mailing/add_senders_email_upload')
  try{
    let archivo = req.file
    let fileExtension = archivo.originalname.split('.')
    if((archivo.mimetype === 'text/csv' || archivo.mimetype === 'application/vnd.ms-excel') && (fileExtension[1].toLowerCase() === 'csv')){
      const fileRows = [];
      csv.fromPath(req.file.path)
        .on("data", function (data) {
          fileRows.push(data);
        })
        .on("end", function () {
          console.log('El resultado en array:', fileRows) //contains array of arrays. Each inner array represents row of the csv file, with each element of it a column
          fs.unlinkSync(req.file.path);   // remove temp file
          //process "fileRows" and respond
        })
        for(let item of fileRows){
          // vemos si es una campaña valida:
          let dataCampaign = await Mailing.searchMailing({id_mailing: item[0]}, true)

          if(dataCampaign.length > 0){
            item[1] = item[1].toLowerCase()
            item[1] = item[1].trim()
            item[1] =  item[1].replace(/ /g,'');
            if(emailValido(item[1])){
              // vemos si no está en lista negra:
              let validaListaNegra = await ListaNegra.searchListaNegra({id_comercio: req.dataLR.id_comercio, email: item[1]})
              if(validaListaNegra.length === 0){
                console.log('solicitamos insertar')
                await MailingTo.insertSingleMailingTo({id_mailing: item[0], email: item[1], nombre: item[2], cuenta: ''})
                console.log('insertamos ')
              }
            }
          }
        }
        
        let dataSenders = await MailingTo.searchMailingTo({ id_mailing: body.senders.id_mailing }, false)
        console.log('terminamos')
        let returnObject = {
          error: false,
          message: "Remitentes ingresados correctamente",
          remitentes: dataSenders[0].total
        }   
        return res.status(200).send(returnObject)
    }else{
      console.log('Tenemos error')
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
routes.post('/upload_image', validate, async(req, res, next) => {
  console.log('Request a mailing/upload_image')
  try{
    const {body} = req
    await Joi.validate(body, bodyUploadImage)

    let blob = body.mailing.image
    let avatar = blob.split(',')
    let extension = 'png'
    let header = null
    if (avatar.length === 2) {
      avatar[0].indexOf('jpeg') != -1 ? extension = 'jpeg' : avatar[0].indexOf('jpg') != -1 ? extension = 'jpg' : avatar[0].indexOf('gif') != -1 ? extension = 'gif' : null
      // avatar[0].indexOf('jpg') != -1 ? extension = 'jpg' : null
      // avatar[0].indexOf('gif') != -1 ? extension = 'gif' : null
      blob = avatar[1]
      header = avatar[0]
    } else {
      blob = avatar[0]
    }
    if(extension !== 'png' && extension !== 'jpeg' && extension !== 'jpg' && extension !== 'gif'){
      return res.status(400).send({error: true, message: 'La imagen solo puede ser formato .gif, .png, .jpg ó .jpeg'})
    }

    let digitos = '123456789abcdefghijklmnopqrstvwxyz'
    let randomString = ''
    let caracteres = 15
    while(caracteres > 0) {
      randomString += digitos.charAt(Math.floor(Math.random() * digitos.length));
      caracteres--;
    }

    let nameBlob = `${randomString}.${extension}`
    let img_url = await uploadAzure('mailing', nameBlob, blob, header)

    let returnObject = {
      error: false,
      message: 'Ok',
      url: img_url
    }
    return res.status(200).send(returnObject)
  }catch(err){
    return next(err)
  }
})
routes.post('/delete_senders',validMailingTo, validate, async(req, res, next) => {
  console.log('Request a mailing/delete_senders')
  try{
    const {body} = req
    await Joi.validate(body, bodyDeleteSenders)
    await MailingTo.deleteMailingTo({id_mailing: body.senders.id_mailing})
    let returnObject = {
      error: false,
      message: 'The elements were removed correctly'
    }
    return res.status(200).send(returnObject)
  }catch(err){
    return next(err)
  }
})

routes.post('/update_stats', async(req, res, next) => {
  console.log('Request a mailing/update_stats')
  try{
    let {body} = req
    await Joi.validate(body, bodyUpdateStats)
    
    let existeMailing = await Mailing.searchMailing({id_mailing: body.mailing.id_mailing}, true)
    if(existeMailing.length === 0){
      return res.status(400).send({error: true, message: 'Debe enviar una campaña de mailing valida'})
    }
    // ahora vemos si aún está dentro de los 20 días de regla de revision:
    let fechaEnvio = moment(existeMailing[0].fecha_envio)
    let ahora = moment()
    let diferencia = ahora.diff(fechaEnvio, 'days')
    if(diferencia > 20){
      return res.status(400).send({error: true, message: 'Esta capaña ya fue enviada, no puede ser modificada'})
    }
    // de lo contrario buscamos los datos para generar el update.
    return res.status(200).send({error: false, message: 'Seguimos'})



  }catch(err){
    return next(err)
  }
})

module.exports = routes

