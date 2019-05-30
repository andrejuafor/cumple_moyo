'use strict'

module.exports = {
  async hoyTexto(){
    let dt = new Date()
    let month = dt.getMonth()+1
    let day = dt.getDate()
    let year = dt.getFullYear()
    let fecha = year + '-' + month + '-' + day
    return fecha
  },
  async diasVigencia(dias){
    let ahora = new Date()
    ahora.setDate(ahora.getDate() + dias)
    let month = ahora.getMonth()+1
    let day = ahora.getDate()
    let year = ahora.getFullYear()
    let vigencia = year + '-' + month + '-' + day
    return vigencia
  }
}