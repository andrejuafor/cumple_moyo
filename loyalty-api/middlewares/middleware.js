'use strict'

const {Office, License, User, UserProfile, Login, Merchant, AccountReference, Mailing} = require('loyalty-db')
const {corporateOffice,} = require('../lib/office')
const auth = require('basic-auth')
const {validaCuenta} = require('../lib/account')
const {validaCupon} = require('../lib/cupon')

const nombrePerfil = async (id_usuario_rol) => {
  try{
    let nomProfile = await UserProfile.searchUserProfile({id_usuario_rol: id_usuario_rol})
    return nomProfile[0].nombre
  }catch(err){
    return err
  }
}

const middlewares =  {
  // Validación general para el api y/o usuario y password
  validate: async function (req, res, next){
    console.log('Validamos el token')
    try{
      req.dataLR = {}
      let dataAuth = req.headers.authorization
      if(req.headers.authorization === undefined){
        next({message:'No se enviaron datos en headers', stack: 'Validate access'})
      }else{
        let infoAuth = dataAuth.split(' ')
        if(infoAuth[0] === 'Bearer'){
          //consultamos el token
          let infoToken = await Login.searchToken(infoAuth[1])
          if(infoToken.length === 0){
            next({message:'El token proporcionado es inválido', stack: 'Validate access'})
          }
          if(infoToken[0].caducidad === 0){
            next({message:'El token proporcionado es inválido', stack: 'Validate access'})
          }
          // vemos si el usuario y la contraseña son válidos:
          let accesoValido = await User.searchUser({id_usuario: infoToken[0].id_usuario})
          req.dataLR.id_usuario = accesoValido[0].id_usuario
          req.dataLR.nombre = accesoValido[0].nombre
          req.dataLR.email = accesoValido[0].email
          req.dataLR.id_usuario_rol = accesoValido[0].id_usuario_rol
          req.dataLR.perfil = await nombrePerfil(accesoValido[0].id_usuario_rol)
          let infoMerchant = await User.merchantOfficeUser(accesoValido[0].id_usuario)
          req.dataLR.id_comercio = infoMerchant[0].id_comercio

          if(req.dataLR.perfil === 'comercio' || req.dataLR.perfil === 'mercadotecnia' || req.dataLR.perfil === 'operaciones' || req.dataLR.perfil === 'dir_general'){
            req.dataLR.tipo_usuario = 'admin_comercio'
            let { body } = req
            if((body.office === undefined && body.office === '') && body.transaction !== undefined && infoMerchant[0].id_sucursal === ''){
              // Si no envian la sucursal y es una transaccion y el usuario no tiene sucursal:
              next({message: 'Es necesario enviar una sucursal', stack: 'Validate Access'})
            }else{
              let sucursalCoorp = await corporateOffice(req.dataLR.id_comercio)
              req.dataLR.corporativo = sucursalCoorp
              let sucursalActual = ''
              if(body.office !== undefined && body.office !== ''){
                if(typeof body.office !== 'number'){
                  next({message: 'Envíe una sucursal válida', stack: 'Validate Access'})
                }else{
                  // Si es cualquier otro proceso por defecto asignamos la sucursal corporativa
                  sucursalActual = body.office
                }
              }else{
                sucursalActual = sucursalCoorp
              }
              let results = await Office.searchOfficeMerchant('',infoMerchant[0].id_comercio, sucursalActual)
              if(results.length === 0){
                next({message: 'Sucursal inválida', stack: 'Validate Access'})
              }
              req.dataLR.nom_sucursal = results[0].sucursal
              req.dataLR.id_sucursal = results[0].id_sucursal
              req.dataLR.round_puntos = results[0].round_puntos
              req.dataLR.punto_x_peso = results[0].punto_x_peso
              req.dataLR.ref_automatico = results[0].ref_automatico
              req.dataLR.notifica_transaccion = results[0].notifica_transaccion
              req.dataLR.validacion_mail_cuenta = results[0].validacion_mail_cuenta
              req.dataLR.channel = 'api'
              req.dataLR.beneficio_inicial_cuentas = results[0].beneficio_inicial_cuentas
              //vemos si se requiere clave para las cuentas:
              // ####################
              if(results[0].clave_sucursal === 1){
                req.dataLR.requiere_clave = true
              }else{
                if(results[0].clave_comercio === 1){
                  req.dataLR.requiere_clave = true
                }else{
                  req.dataLR.requiere_clave = false
                }
              }
              next()
            }
          }else if(req.dataLR.perfil === 'operador' || req.dataLR.perfil === 'gerente' || req.dataLR.perfil === 'monedero' || req.dataLR.perfil === 'sucursal' || req.dataLR.perfil === 'capturista'){
            req.dataLR.tipo_usuario = 'comercio'
            let results = await Office.searchOfficeMerchant('',infoMerchant[0].id_comercio, infoMerchant[0].id_sucursal)
            req.dataLR.nom_sucursal = results[0].sucursal
            req.dataLR.nom_comercio = results[0].comercio
            req.dataLR.id_sucursal = results[0].id_sucursal
            req.dataLR.round_puntos = results[0].round_puntos
            req.dataLR.punto_x_peso = results[0].punto_x_peso
            req.dataLR.ref_automatico = results[0].ref_automatico
            req.dataLR.notifica_transaccion = results[0].notifica_transaccion
            req.dataLR.validacion_mail_cuenta = results[0].validacion_mail_cuenta
            req.dataLR.channel = 'api'
            req.dataLR.beneficio_inicial_cuentas = results[0].beneficio_inicial_cuentas
            //vemos si se requiere clave para las cuentas:
            // ####################
            if(results[0].clave_sucursal === 1){
              req.dataLR.requiere_clave = true
            }else{
              if(results[0].clave_comercio === 1){
                req.dataLR.requiere_clave = true
              }else{
                req.dataLR.requiere_clave = false
              }
            }
            // Obtenemos la sucursal coorporativa:
            let sucursalCoorp = await corporateOffice(results[0].id_comercio)
            req.dataLR.corporativo = sucursalCoorp
            next()
          }else{
            req.dataLR.tipo_usuario = 'admin'
            next({message:'Aún no tiene acceso a este sistema, ingrese desde https://loyaltyrefunds.com/login.terminal', stack: 'Validate access'})
          }
        }else{
          console.log('Antes del query')
          let results = await Office.searchOfficeMerchant(req.headers.authorization, '', '')
          console.log('Despues del primer query')
          if(results.length === 0){
            next({message:'Datos de acceso incorrectos', stack: 'Validate access'})
          }else{
            // vemos si la licencia aún es válida:
            let validaLicencia = await License.licenciaValida(results[0].id_comercio)
            if(validaLicencia[0].estatus === 1){
              req.dataLR.id_comercio = results[0].id_comercio
              req.dataLR.nom_comercio = results[0].comercio
              req.dataLR.nom_sucursal = results[0].sucursal
              req.dataLR.id_sucursal = results[0].id_sucursal
              req.dataLR.round_puntos = results[0].round_puntos
              req.dataLR.punto_x_peso = results[0].punto_x_peso
              req.dataLR.ref_automatico = results[0].ref_automatico
              req.dataLR.notifica_transaccion = results[0].notifica_transaccion
              req.dataLR.validacion_mail_cuenta = results[0].validacion_mail_cuenta
              req.dataLR.channel = 'api'
              req.dataLR.beneficio_inicial_cuentas = results[0].beneficio_inicial_cuentas
              //vemos si se requiere clave para las cuentas:
              // ####################
              if(results[0].clave_sucursal === 1){
                req.dataLR.requiere_clave = true
              }else{
                if(results[0].clave_comercio === 1){
                  req.dataLR.requiere_clave = true
                }else{
                  req.dataLR.requiere_clave = false
                }
              }
              // ####################
              // Obtenemos la sucursal coorporativa:
              let sucursalCoorp = await corporateOffice(results[0].id_comercio)
              req.dataLR.corporativo = sucursalCoorp
              req.dataLR.id_usuario = null
              req.dataLR.id_perfil = null
              next()
            }else{
              next({message:'Licencia expirada', stack: 'Validate access'})
            }
          }
        }
      }
    }catch(error){
      next(error)
    }
  },
  //validacion de cuenta, en caso de existir
  validateAccount: async function(req, res, next){
    console.log('Validamos la cuenta')
    try{
      let cuentaRec = ''
      if(req.body.conditions){
        let {conditions} = req.body
        if(conditions.account === undefined || conditions.account === ''){
          next({message:'La cuenta es requerida', stack:'Validate Account'})
        }
        cuentaRec = conditions.account
      }
      if(req.body.account){
        let {account} = req.body
        console.log(account)
        if(account.account === undefined || account.account === ''){
          next({message:'La cuenta es requerida', stack:'Validate Account'})
        }
        cuentaRec = account.account
      }
      if(req.body.transaction){
        let {transaction} = req.body
        if(transaction.account === undefined || transaction.account === ''){
          next({message:'La cuenta es requerida', stack:'Validate Account'})
        }
        cuentaRec = transaction.account
      }
      // separamos el account
      let buff = new Buffer(cuentaRec, 'base64');  
      let accountDetail = buff.toString('ascii');
      let infoAccount = accountDetail.split(':')
      let cuentaFin = ''
      let passGroup = []
      let passFin = ''
      for(let i = 0; i < infoAccount.length; i++){
        if(i === 0){
          cuentaFin = infoAccount[i]
        }else{
          passGroup.push(infoAccount[i])
        }
      }
      passFin = passGroup.join(':')
      // desencriptamos el 
      if(cuentaFin === ''){
        next({message:'La cuenta es requerida', stack:'Validate Account'})
      }
      let revisaCuenta = await validaCuenta(cuentaFin, passFin, req.dataLR.id_comercio, req.dataLR.requiere_clave)
      if(revisaCuenta.error === false){
        req.dataLR.existe_comercio = revisaCuenta.existe_comercio
        req.dataLR.infoCuenta = revisaCuenta.result[0]
        next()
      }else{
        next({message:revisaCuenta.message, stack:'Validate Account'})
      }
    }catch(error){
      next(error)
    }
  },
  // Validamos si es una transaccion concepto es obligatorio, si es monedero, no es obligatorio el concepto, el cupon y la cuenta referenciable
  validateTransaction: async function(req, res, next){
    console.log('Validamos la transaccion')
    try{
      let continuar = 0
      let {body} = req
      //validamos si existe cupon, vemos si es valido
      if(body.transaction.coupon !== undefined && body.transaction.coupon !== ''){
        //vemos si el cupon existe:
        let detalleCupon = await validaCupon(body.transaction.coupon,req.dataLR.id_comercio, req.dataLR.infoCuenta.cuenta)
        if(detalleCupon.cuponValido === false){
          next({message: detalleCupon.message, stack:'Transaction/Coupon'})
        }
        req.dataLR.infoCupon = detalleCupon.infoCupon
        continuar++
      }else{
        continuar++
      }

      //validamos el concepto
      // if(body.transaction.ewallet === false){
      //   if(body.transaction.concept === undefined || body.transaction.concept.trim().length === 0){
      //     next('El concepto es requerido para la captura de transacción')
      //   }
      // }
      
      //validamos si llegó una cuenta referenciable:
      if(body.transaction.referable !== undefined && body.transaction.referable !== ''){
        if(body.transaction.ewallet === true){
          continuar++
        }else{
          // primero vemos que la cuenta referenciable no sea igual a la cuenta de la transacción:
          if(body.transaction.referable === req.dataLR.infoCuenta.cuenta){
            next({message: 'La cuenta referenciable no puede ser igual a la cuenta de la transacción', stack:'Transaction/Capture'})
          }
          // validamos si la cuenta referenciable se encuentra en el comercio:
          let infoReferenciable = await AccountReference.searchAccountReference({cuenta: body.transaction.referable, id_comercio: req.dataLR.id_comercio})
          if(infoReferenciable.length === 0){
            next({message: 'La cuenta no es referenciable', stack:'Transaction/Capture'})
          }
          req.body.infoReferenciable = infoReferenciable[0]
          continuar++
        }
      }else{
        continuar++
      }

      if(continuar > 0){
        next()
      }
      
    }catch(err){
      next(err)
    }
  },
  validatePaid: async function(req, res, next){
    console.log('Validamos la transaccion')
    try{
      // Moyo no puede realizar pagos en jueves
      let hoy = new Date()
      let diaSemana = hoy.getDay()
      console.log('Hoy es: ', diaSemana)
      // Primero vemos si se aceptan pagos en este dia:
      if(req.dataLR.id_comercio === 417 && diaSemana === 4){
        next({message:'No puedes realizar pago con puntos los días jueves.', stack:'Paid/Coupon'})
      }

      let {body} = req
      // Vemos si el comercio requiere datos de cuenta llenos:
      let pocosDatos = await Merchant.littleData(req.dataLR.id_comercio)
      /**
       * Si esta opción esta activa tus cuentas no podran pagar con puntos si no han registrado todos sus datos
       *  (sexo, telefono, email, fecha de nacimiento, codigó postal)
       */
      console.log('La fecha de nacimiento es: ', req.dataLR.infoCuenta.fecha_nacimiento)
      //let fecha_nacimiento_valida = req.dataLR.infoCuenta.fecha_nacimiento.split('-')
      if( (pocosDatos[0].registro_completo_cuenta === 1) && (req.dataLR.infoCuenta.sexo === '' || req.dataLR.infoCuenta.cel === '' || req.dataLR.infoCuenta.email === '' || req.dataLR.infoCuenta.fecha_nacimiento === ''  || req.dataLR.infoCuenta.codigo_postal === '')){
        if(req.dataLR.infoCuenta.sexo !== 'w'){
          // si no es cupon rechazamos la petición.
          next({message:'La cuenta debe tener datos completos para poder hacer un pago con puntos.', stack:'Paid/Coupon'})
        }
      }else{
        //validamos si existe cupon, vemos si es valido
        if(body.transaction.coupon !== undefined && body.transaction.coupon !== ''){
          //vemos si el cupon existe:
          let detalleCupon = await validaCupon(body.transaction.coupon, req.dataLR.id_comercio, req.dataLR.infoCuenta.cuenta)
          if(detalleCupon.cuponValido === false){
            next({message: detalleCupon.message, stack:'Paid/Coupon'})
          }
          console.log('Detalle cupon en validacion de pago con puntos', detalleCupon)
          if(detalleCupon.infoCupon.tipo_retorno === 'informativo' || detalleCupon.infoCupon.tipo_retorno === 'punto_fijo'){
            req.dataLR.infoCupon = detalleCupon.infoCupon
            next()
          }else{
            next({message:'El cupón no puede ser usado para pago con puntos', stack:'Paid/Coupon'})
          }
        }else{
          next()
        }
      }
    }catch(err){
      next(err)
    }
  },
  pocosDatos: async function(req, res, next){
    try{
      let pocosDatos = await Merchant.littleData(req.dataLR.id_comercio)
      req.dataLR.registro_completo = (pocosDatos[0].registro_completo_cuenta === 1) ? 1 : 0
      req.dataLR.registro_completo_cuenta = (pocosDatos[0].validacion_registro_operador_completo === 1) ? 1 : 0
      next()
    }catch(err){
      next(err)
    }
  },
  validMailingTo: async function(req, res, next){
    try{
      let dataCampaign = await Mailing.searchMailing({id_mailing: req.senders.id_mailing}, true)
      if(dataCampaign.length === 0){
        next({message: 'La campaña enviada no existe', stack: 'Mailing'})
      }else{
        let ahora = new Date()
        let fechaEnvio = new Date(`${dataCampaign[0].fecha_envio} ${dataCampaign[0].hora_envio}`)
        if(fechaEnvio <= ahora){
          next({message: 'Ya no puede editar esta campaña, ya fue enviada', stack: 'Mailing'})
        }else{
          next()
        }
      }
    }catch(err){
      next(err)
    }
  }
}

module.exports = middlewares