'use strict'

const debug = require('debug')('loyalty-api:*')
const http = require('http')
const chalk = require('chalk')
const express = require('express')
const bodyParser = require('body-parser')
const helmet = require('helmet')

const port = process.env.PORT || 3000
const app = express()
const server = http.createServer(app)

const {
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
} = require('./routes')

// Evitar problemas de CORS:
app.use(function (req, res, next) {
  // Request headers you wish to allow
  res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization')
  // Website you wish to allow to connect
  res.setHeader('Access-Control-Allow-Origin', '*')
  // Request methods you wish to allow
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE')
  // Set to true if you need the website to include cookies in the requests sent
  // to the API (e.g. in case you use sessions)
  res.setHeader('Access-Control-Allow-Credentials', true)
  // Pass to next layer of middleware
  next()
})


app.use(bodyParser.urlencoded({ extended: false }))
app.use(bodyParser.json({limit: '1153433'}))
app.use(helmet())

// Handlers para las rutas según los modelos:
app.use('/account', account)
app.use('/transaction', transaction)
app.use('/category', category)
app.use('/convert_account', convert_account)
app.use('/login', login)
app.use('/migracion',actualiza_cuentas)
app.use('/coupon', coupon)
app.use('/report', report)
app.use('/office', office)
app.use('/mailing', mailing)
app.use('/report', report)

// Express Error Handler
app.use((err, req, res, next) => {
  debug(err)
  debug(`Error message: ${err.message}`)
  res.status(400).send({
    error: true,
    stack: err,
    message: `${err.message}`,
    results: null
  })
})

function handleFatalError (err) {
  console.error(`${chalk.red('[fatal error]')} ${err.message}`)
  console.error(err.stack)
  process.exit(1)
}

if (!module.parent) {
  process.on('uncaughtException', handleFatalError)
  process.on('unhandledRejection', handleFatalError)
  
  server.listen(port, () => {
    console.log(`${chalk.green('[loyaltyrefunds-api]')} server listening on port ${port}`)
    console.log(`Estamos en ambiente de: ${(process.env.ENVIROMENT === 'production') ? 'PRODUCCION': 'DESARROLLO'}`)
  })
  server.timeout = 28000
}
