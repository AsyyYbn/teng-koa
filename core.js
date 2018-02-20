'use strict'

// Import Packages
const winston = require('winston')
const nconf = require('nconf')
const colors = require('colors/safe')
const Koa = require('koa') // Koa v2
// const mail = require('./src/mail')

// PreStart
const preStart = require('./src/prestart')
preStart.load()

// Use blubird promise
global.Promise = require('bluebird')

// Register Server
const app = new Koa()

// Load CronJob
const cron = require('./src/cron')
cron.load()

// Register Middlewares (Plugins)
async function registerMiddlewares () {
  try {
    const middlewares = require('./plugins')
    for (let middleware of middlewares) {
      app.use(middleware)
    }
    winston.verbose('All Plugins Load done.')
  } catch (e) {
    winston.error(e)
    // mail.error(e)
    process.exit(1)
  }
}

// Load Route
async function registerRoutes (routes) {
  try {
    const router = await routes
    app
      .use(router.routes())
      .use(router.allowedMethods())
    winston.verbose('All Routes Load done.')
  } catch (e) {
    winston.error(e)
    // mail.error(e)
    process.exit(1)
  }
}

// Start Server
async function start () {
  try {
    await registerMiddlewares()
    const Routes = require('./src/route')
    await registerRoutes(new Routes())
    await app.listen(nconf.get('server:port'))
  } catch (e) {
    winston.error(e)
    // mail.error(e)
    process.exit(1)
  }
}
start()
winston.info(colors.green('Server is started. Listening on Port:' + nconf.get('server:port')))
