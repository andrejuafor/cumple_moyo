'use strict'

module.exports = {
  async hoyTexto(){
    let dt = new Date();
    let month = dt.getMonth()+1;
    let day = dt.getDate();
    let year = dt.getFullYear();
    let fecha = year + '-' + month + '-' + day;
    return fecha
  }
}