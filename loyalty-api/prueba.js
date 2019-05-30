'use strict'

const {Account, Transaction, OfficeAccount, BenefitRegistry, TransactionDetail, AccountCupon, User, Cupon, Merchant} = require('loyalty-db')
const {passCuenta} = require('./lib/account')
async function actualizaSucursalCuenta () {
  try{
    console.log('Iniciamos')
    let contador = 0
    let actualizada = 0
    let infoCuentas = await Account.searchAccount({})
    console.log(infoCuentas.length)
    for(let item of infoCuentas){
      console.log('Contador: ', contador)
      let infoSucursalCuenta = await OfficeAccount.searchOfficAccountSimple({cuenta:item.cuenta})
      for(let item1 of infoSucursalCuenta){
        if(item.email !== item1.email && item.cuenta === item1.cuenta){

          let dataUpdate = {
            nombre: item.nombre,
            apellidos: item.apellidos,
            email: item.email,
            cel: item.cel,
            codigo_postal: item.codigo_postal,
            sexo: item.sexo,
            fecha_nac_dia: item.fecha_nac_dia,
            fecha_nac_mes: item.fecha_nac_mes,
            fecha_nac_ano: item.fecha_nac_ano,
            id_sucursal_cuenta: item1.id_sucursal_cuenta
          }
          //console.log(dataUpdate)
          if(item1.id_sucursal_cuenta !== 1635772){
            await OfficeAccount.updateOfficeAccount(dataUpdate)
          }
          
          actualizada++
        }
      }
      contador++
    }
    console.log('Las cuentas actualizadas son:', actualizada)
  }catch(err){
    console.log(err)
  }
}

async function creaUsuariosCuenta(){
  try{
    console.log('Iniciamos creaUsuariosCuenta()')
    let actualizadas = 0
    // Primero vemos las cuentas que el id_usuario es null
    let cuentas = await Account.cuentasSinUsuario()
    console.log('Cuentas a revisar: ', cuentas.length)
    for(let item of cuentas){
      //vemos si el numero existe en usuario:
      let dataUsuario = await User.searchUser({usuario: item.numero})
      if(dataUsuario.length === 0){
        // creamos el dato en la tabla de usuario
        let claveCuenta = await passCuenta(item.numero)
        let dataInsert = {
          usuario_rol: 5,
          usuario: item.numero,
          pass: claveCuenta,
          nombre: item.nombre,
          apellidos: item.apellidos,
          email: item.email,
          codigo_postal: item.codigo_postal
        }
        let altaUsuario = await User.createUser(dataInsert)
        // Ligamos el id de usuario a la cuenta
        await Account.actualizaIdUsuario(altaUsuario.insertId, item.id_cuenta)
        actualizadas++
      }else{
        // vemos que ese id tenga el mismo numero de cuenta
        if(item.numero === dataUsuario[0].usuario){
          // solo actualizamos la cuenta
          await Account.actualizaIdUsuario(dataUsuario[0].id_usuario, item.id_cuenta)
          actualizadas++
        }
      }
    }
    console.log('Cuentas actualizadas: ', actualizadas)
  }catch(err){
    console.log(err)
  }
}

async function actualizaCuenta(){
  try{
    let cuenta = '31575'
    let comercio = 85
    let infoCuenta = await OfficeAccount.searchOfficAccountSimple({cuenta: cuenta})
    let claveCuenta = await passCuenta(cuenta)
    let dataInsert = {
      usuario_rol: 5,
      usuario: cuenta,
      pass: claveCuenta,
      nombre: infoCuenta[0].nombre,
      apellidos: infoCuenta[0].apellidos,
      email: infoCuenta[0].email,
      codigo_postal: infoCuenta[0].codigo_postal
    }
    let altaUsuario = await User.createUser(dataInsert)
    dataInsert.id_usuario = altaUsuario.insertId
    dataInsert.numero = cuenta
    dataInsert.fecha_nac_dia = infoCuenta[0].fecha_nac_dia
    dataInsert.fecha_nac_mes = infoCuenta[0].fecha_nac_mes
    dataInsert.fecha_nac_ano = infoCuenta[0].fecha_nac_ano
    dataInsert.sexo = infoCuenta[0].sexo
    dataInsert.cel = infoCuenta[0].cel
    dataInsert.comercio_registro = comercio

    let altaCuenta = await Account.createAccount(dataInsert)
    console.log('Terminado')
  }catch(err){
    console.log(err)
  }
}

// actualizaSucursalCuenta()

//creaUsuariosCuenta()

// actualizaCuenta()