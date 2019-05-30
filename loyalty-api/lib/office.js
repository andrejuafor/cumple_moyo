'use strict'

const {Office} = require('loyalty-db')

module.exports = {
  async corporateOffice(id_comercio){
    try{
      // primero vemos si existe una sucursal con nombre corporativo:
      let corporativo = await Office.corporateOffice(id_comercio)
      if(corporativo.length > 0){
        return corporativo[0].id_sucursal
      }else{
        // Obtenemos la primera sucursal registrada:
        let corporativoAlt = await Office.firstOfficeReg(id_comercio)
        return corporativoAlt[0].id_sucursal
      }
    }catch(err){
      return err
    }
  }
}
