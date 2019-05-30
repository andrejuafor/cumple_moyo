'use strict'
const debug = require('debug')('loyalty-api:*')
const {Account, OfficeAccount, DailyBalance, User} = require('loyalty-db')
const md5 = require("crypto-js/md5");
const sha256 = require('crypto-js/sha256')
const {consultaSaldoFecha, saldoAhora} = require('./saldo')
const {hoyTexto} = require('./misselaneos')

const numeroCuenta = (canal) => {
  // con esta función creamos una cuenta:
  let caracteres = 9
  if(canal === 'web'){
    caracteres = 10
  }else if(canal === 'api'){
    caracteres = 9
  }else if(canal === 'monedero'){
    caracteres = 6
  }else{
    // si es por sistema:
    caracteres = 9
  }
  let digitos = '123456789'
  let randomString = ''
  while(caracteres > 0) {
    randomString += digitos.charAt(Math.floor(Math.random() * digitos.length));
    caracteres--;
  }
  if(canal === 'monedero'){
    randomString = 'M' + randomString
  }
  return randomString
}
const claveCuenta = '4e5d2145dfeFeodi'

function emailValido(email) {
  if(email === 'a@a.a'){
    return true
  }
  var re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
  return re.test(String(email).toLowerCase());
}

const correoValido = async(email) => {
  try{
    if(email !== 'a@a.a'){
      // Primero validamos el correo en los usuarios:
      let validaCorreoUser = await User.searchUser({email:email})
      if(validaCorreoUser.length > 0){
        return false
      }
      let validaCorreo = await Account.searchAccount({email:email})
      if(validaCorreo.length > 0){
        return false
      }else{
        return true
      }
    }else{
      return true
    }
  }catch(err){
    return err
  }
}

const celularValido = async(cel) => {
  try{
    if(cel !== '1111122222'){
      let validaCelular = await Account.searchAccount({cel:cel})
      if(validaCelular.length > 0){
        return false
      }else{
        return true
      }
    }else{
      return true
    }
  }catch(err){
    return err
  } 
}

const cuentaPassword = async(cuenta) => {
  cuenta = cuenta.toString()
    //pasamos todo a minusculas
    let pass = cuenta.toLowerCase()
    // quitamos los espacios
    pass = pass.trim()
    // encriptamos:
    pass = md5(pass+claveCuenta).toString()
    pass = pass.substr(0,6)
    return pass
}


module.exports = {
  async validaCuenta(cuenta, clave, id_comercio, requiere_clave){
    try{
      let dataCuenta = {
        account: cuenta,
      }
      // primero validamos que exista la cuenta en general:
      let infoCuenta = await Account.infoAccount(dataCuenta)
      let result = {}
      let claveValida = false
      if(infoCuenta.length > 0){
        if(requiere_clave === true){
          
          if(infoCuenta[0].pass === clave || infoCuenta[0].codigo_postal === clave) {
            claveValida = true
          }
        }else{
          claveValida = true
        }
        if(claveValida === true){
          // ahora validamos que exista en el comercio:
          let dataSucursalCuenta = {
            cuenta: infoCuenta[0].cuenta,
            id_comercio: id_comercio
          }
          
          let infoSucursalCuenta = await OfficeAccount.dateStartMerchant(dataSucursalCuenta)
          
          if(infoSucursalCuenta.length > 0){
            infoCuenta[0].fecha_registro_comercio = infoSucursalCuenta[0].fecha_registro
            infoCuenta[0].sucursal_registro = infoSucursalCuenta[0].sucursal
          }
          result.error = false
          result.existe_comercio = infoSucursalCuenta.length > 0 ? true : false
          result.result = infoCuenta
        }else{
          result.error = true
          result.message = 'Datos de acceso para la cuenta incorrectos'
        }
      }else{
        result.error = true
        result.message = 'La cuenta no existe'
      }
      return result
    }catch(err){
      return err
    }
  },
  async validaCuentaComercio(cuenta, id_comercio){
    try{
      // ahora validamos que exista en el comercio:
      let dataSucursalCuenta = {
        cuenta: cuenta,
        id_comercio: id_comercio
      }
      let infoSucursalCuenta = await OfficeAccount.dateStartMerchant(dataSucursalCuenta)
      if(infoSucursalCuenta.length > 0){
        let result = {
          error: false,
          result: infoSucursalCuenta
        }
        return result
      }else{
        let result = {
          error: true,
          message: "La cuenta no pertenece al comercio"
        }
        return result
      }
    }catch(err){
      return err
    }
  },
  async existeCuenta(cuenta){
    try{
      if(cuenta !== ''){
        let dataCuenta = {
          account: cuenta,
        }
        // vemos si existe la cuenta:
        let infoCuenta = await Account.infoAccount(dataCuenta)
        if(infoCuenta.length > 0){
          let returnObject = {
            error: false,
            result: infoCuenta
          }
          return returnObject
        }else{
          let returnObject = {
            error: true,
            message: "La cuenta no existe"
          }
          return returnObject
        }
      }else{
        let returnObject = {
          error: true,
          message: "La cuenta no existe"
        }
        return returnObject
      }
    }catch(err){
      return err
    }
  },
  async crearNumero(canal){
    try{
      let valida = true
      let numero = ''
      while(valida){
        numero = numeroCuenta(canal)
        let validaNumero = await Account.searchAccount({cuenta:numero})
        if(validaNumero.length === 0){
          valida = false
        }
      }
      return numero
    }catch(err){
      return err   
    }
  },
  async validaCel(cel){
    try{
      if(cel !== '1111122222'){
        let validaCelular = await Account.searchAccount({cel:cel})
        if(validaCelular.length > 0){
          return false
        }else{
          return true
        }
      }else{
        if(cel === ''){
          return false
        }
        return true
      }
    }catch(err){
      return err
    } 
  },
  async validaMail(email){
    try{
      if(email !== 'a@a.a'){
        // Primero validamos el correo en los usuarios:
        let validaCorreoUser = await User.searchUser({email:email})
        if(validaCorreoUser.length > 0){
          console.log('Existe en la tabla de usuarios')
          return false
        }
        let validaCorreo = await Account.searchAccount({email:email})
        if(validaCorreo.length > 0){
          console.log('Existe en la tabla de cuentas')
          return false
        }else{
          return true
        }
      }else{
        if(email === ''){
          return false
        }
        return true
      }
    }catch(err){
      return err
    } 
  },
  async passCuenta(cuenta){
    cuenta = cuenta.toString().trim().toLowerCase()
    // encriptamos:
    let pass = md5(cuenta+claveCuenta).toString()
    pass = pass.substr(0,6)
    return pass
  },
  async actualizaSaldo(cuenta, id_comercio, puntos){
    try{
      /*
      //primero vemos si tenemos un registro en la tabla
      let consultaSaldoDiario = await DailyBalance.getSaldoDiario(cuenta, id_comercio)
      if(consultaSaldoDiario.length === 0){
        let saldoFinal = await saldoAhora(cuenta, id_comercio, '')
        // si no existe un registro insertamos el saldo inicial
        await DailyBalance.insertSaldoDiario({id_comercio:id_comercio, cuenta: cuenta, saldo: saldoFinal })
        let returnObject = {
          error: false,
          montoFinal: saldoFinal,
          message: "Saldo actualizado correctamente"
        }
        return returnObject
      }
      // si no existe obtenemos el saldo y lo actualizamos:
      let diferencia = 0
      if(Number(puntos) < 0){
        diferencia = ((Number(consultaSaldoDiario[0].saldo) - (Number(puntos) * -1)) < 0) ? 0 : Number(consultaSaldoDiario[0].saldo) - (Number(puntos) * -1)
      }else{
        diferencia = Number(consultaSaldoDiario[0].saldo) + Number(puntos)
      }
      //actualizamos el saldo:
      let actualizaSaldo = DailyBalance.updateSaldoDiario(cuenta, id_comercio, diferencia)
      let returnObject = {
        error: false,
        montoFinal: diferencia,
        message: "Saldo actualizado correctamente"
      }
      */
      
      let saldoFinal = await saldoAhora(cuenta, id_comercio, '')
      let returnObject = {
        error: false,
        montoFinal: saldoFinal,
        message: "Saldo actualizado correctamente"
      }

      return returnObject
    }catch(err){
      return err
    }
  },
  async actualizaSaldoCompleto(cuenta, id_comercio){
    console.log('Actualizamos saldo de la cuenta')
    try{
      /*
      let consultaSaldoDiario = await DailyBalance.getSaldoDiario(cuenta, id_comercio)
      console.log(`Cuenta: ${cuenta}, Id comercio: ${id_comercio}`)
      
      let saldoFinal = await consultaSaldoFecha(cuenta, id_comercio, '')

      console.log('El saldo final es: ', saldoFinal)
      if(consultaSaldoDiario.length === 0){
        console.log('Insertamos el saldo')
        // insertamos el saldo
        await DailyBalance.insertSaldoDiario({id_comercio:id_comercio, cuenta: cuenta, saldo: saldoFinal})
      }else{
        console.log('Actualizamos el saldo')
        // actualizamos el saldo
        await DailyBalance.updateSaldoDiario(cuenta, id_comercio, saldoFinal)
      }
      */
      let saldoFinal = await consultaSaldoFecha(cuenta, id_comercio, '')

      return saldoFinal
    }catch(error){
      return error
    }
  },
  async actualizaSaldoAhora(cuenta, id_comercio, saldo){
    let returnObject = {
      cuenta: cuenta,
      id_comercio: id_comercio,
      saldo: saldo
    }
    return returnObject
    /*
    let consultaSaldoDiario = await DailyBalance.getSaldoDiario(cuenta, id_comercio)
    if(consultaSaldoDiario.length === 0){
      console.log('Insertamos el saldo')
      // insertamos el saldo
      await DailyBalance.insertSaldoDiario({id_comercio:id_comercio, cuenta: cuenta, saldo: saldo})
    }else{
      console.log('Actualizamos el saldo')
      // actualizamos el saldo
      await DailyBalance.updateSaldoDiario(cuenta, id_comercio, saldo)
    }
    */
  },
  async validaLineaBachCuenta(data, requiere_clave){
    let cuenta = ''
    let clave = ''
    let returnObject = {
      error: false
    }
    if(data.length < 12){
      returnObject.error = true
      returnObject.message = 'El registro no cuenta con el numero de campos requeridos'
      return returnObject
    }
    if(data[12].trim() !== 'ND' && data[12].trim() !== 'NF' && data[12].trim() !== 'M' && data[12].trim() !== 'E' && data[12].trim() !== 'MON'){
      returnObject.error = true
      returnObject.message = 'No es un indicador valido.'
      return returnObject
    }
    if(data[12].trim() === 'MON'){
      // El monedero solo se valida cuenta y clave
      if(data[10] === undefined || data[11] === undefined || data[10] === '' || data[11] === ''){
        returnObject.error = true
        returnObject.message = 'Falta la cuenta y la clave'
        return returnObject
      }
      // vemos si ya existe la cuenta:
      let validaCuenta1 = await Account.validationAccount({cuenta:data[10]})
      if(validaCuenta1.length > 0){
        returnObject.error = true
        returnObject.message = 'La cuenta ya existe'
        return returnObject
      }
      // Vemos si la clave es correcta
      let claveValida = await cuentaPassword(data[10].trim())
      if(claveValida !== data[11].trim()){
        returnObject.error = true
        returnObject.message = `La clave es incorrecta`
        return returnObject
      }
      return returnObject
    }else if(data[12].trim() === 'ND'){
      // Si es una cuenta nueva digital, validamos los campos de mail y celular
      if(emailValido(data[2].trim()) === false){
        returnObject.error = true
        returnObject.message = 'Correo invalido'
        return returnObject
      }
      let validaEmail = await correoValido(data[2].trim())
      if(validaEmail === false){
        returnObject.error = true
        returnObject.message = 'El correo ya existe'
        return returnObject
      }
      if(data[8].trim().length !== 10){
        returnObject.error = true
        returnObject.message = 'Numero inválido; solo números a 10 dígitos sin espacios ni guiones'
        return returnObject
      }
      let validaCel = await celularValido(data[8])
      if(validaCel === false){
        returnObject.error = true
        returnObject.message = 'El teléfono ya existe'
        return returnObject
      }
      if(data[0].trim() === '' || data[1] === '' || data[6] === '' || data[8] === ''){
        returnObject.error = true
        returnObject.message = 'Faltan datos para registrar la cuenta'
        return returnObject
      }
      return returnObject
    }else if(data[12].trim() === 'NF'){
      // Si es una nueva cuenta fisica, validamos que exista la cuenta, que el password sea correcto y que tenga los campos
      // vemos si ya existe la cuenta:
      let validaCuenta1 = await Account.validationAccount({cuenta:data[10]})
      if(validaCuenta1.length > 0){
        returnObject.error = true
        returnObject.message = 'La cuenta ya existe'
        return returnObject
      }
      // Vemos si la clave es correcta
      let claveValida = await cuentaPassword(data[10].trim())
      if(claveValida !== data[11].trim()){
        returnObject.error = true
        returnObject.message = `La clave es incorrecta`
        return returnObject
      }
      if(emailValido(data[2].trim()) === false){
        returnObject.error = true
        returnObject.message = 'Correo invalido'
        return returnObject
      }
      let validaEmail = await correoValido(data[2].trim())
      if(validaEmail === false){
        returnObject.error = true
        returnObject.message = 'El correo ya existe'
        return returnObject
      }
      if(data[8].trim().length !== 10){
        returnObject.error = true
        returnObject.message = 'Numero inválido; solo números a 10 dígitos sin espacios ni guiones'
        return returnObject
      }
      let validaCel = await celularValido(data[8])
      if(validaCel === false){
        returnObject.error = true
        returnObject.message = 'El teléfono ya existe'
        return returnObject
      }
      if(data[0].trim() === '' || data[1] === '' || data[6] === '' || data[8] === ''){
        returnObject.error = true
        returnObject.message = 'Faltan datos para registrar la cuenta'
        return returnObject
      }
      return returnObject
    }else if(data[12].trim() === 'M'){
      // Validamos que exista la cuenta
      let dataAccount = await Account.infoAccount({account: data[10]})
      if(dataAccount.length === 0){
        returnObject.error = true
        returnObject.message = 'La cuenta no existe'
        return returnObject
      }
      // Validamos la contraseña
      if(requiere_clave === true && dataAccount[0].pass !== data[11]){
        returnObject.error = true
        returnObject.message = 'La clave es incorrecta'
        return returnObject
      }
      // Vemos si trae correo lo validamos
      if(data[2] !== 'a@a.a' && dataAccount[0].email !== data[2] && data[2] !== ''){
        if(emailValido(data[2]) === false){
          returnObject.error = true
          returnObject.message = 'Correo inválido'
          return returnObject
        }
        let dataAccount = {
          email: data[2].trim()
        }
        let validaCuenta = await Account.validationAccount(dataAccount)
        if(validaCuenta.length > 0){
          returnObject.error = true
          returnObject.message = 'El correo ya existe'
          return returnObject
        }
      }
      // vemos si trae celular lo validamos:
      if(data[8].trim() !== '1111122222' && dataAccount[0].email !== data[8] && data[8] !== ''){
        if(data[8].trim().length !== 10 && Number.isInteger(data[8].trim()) === false){
          returnObject.error = true
          returnObject.message = 'Número de teléfono inválido, debe ser solo numeros y a 10 dígitos'
          return returnObject
        }
        let dataAccount = {
          cel: data[8].trim()
        }
        let validaCuenta = await Account.validationAccount(dataAccount)
        if(validaCuenta.length > 0){
          returnObject.error = true
          returnObject.message = 'El teléfono ya existe'
          return returnObject
        }
      }
      if(data[0] === '' || data[1] === '' || data[6] === '' || data[8] === ''){
        returnObject.error = true
        returnObject.message = 'Faltan datos para actualizar la cuenta'
        return returnObject
      }
      return returnObject
    }else if(data[12].trim() === 'E'){
      // Validamos que exista la cuenta
      let dataAccount = await Account.infoAccount({account: data[10]})
      if(dataAccount.length === 0){
        returnObject.error = true
        returnObject.message = 'La cuenta no existe'
        return returnObject
      }
      // Validamos la contraseña
      if(requiere_clave === true && dataAccount[0].pass !== data[11]){
        returnObject.error = true
        returnObject.message = 'La clave es incorrecta'
        return returnObject
      }
      return returnObject
    }
    // validaciones generales:
    if(data[7] !== '' && data[7].trim().toUpperCase() !== 'M' && data[7].trim().toUpperCase() !== 'F'){
      returnObject.error = true
      returnObject.message = 'El valor del sexo es incorrecto'
      return returnObject
    }
    return returnObject
  }, 
  async validaPassword(cuenta){
    let clave = await cuentaPassword(cuenta)
    return clave
  }
}