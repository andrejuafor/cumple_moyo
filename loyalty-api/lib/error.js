'use strict'

module.exports = {
  joiValidate(validate){
    let errores = []
    if(validate.error !== null){
      for(let item of validate.error.details){
        errores.push(item.context.label)
      }
      let returnObject = {error: true, message: errores.join(', ')}
      return returnObject
      // return res.status(400).json(returnObject);
    }else{
      let returnObject = {error: false, message: 'Todo OK'}
      return returnObject
    }
  }
}