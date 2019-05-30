'use-strict'

const account = require('./account')
const transaction = require('./transaction')
const category = require('./category')
const convert_account = require('./convert_account')
const login = require('./login')
const actualiza_cuentas = require('./actualiza_cuentas')
const coupon = require('./coupon')
const report = require('./report')
const office = require('./office')
const mailing = require('./mailing')

module.exports = {
  account,
  transaction,
  category,
  convert_account,
  login,
  actualiza_cuentas,
  coupon,
  report,
  office,
  mailing
}
