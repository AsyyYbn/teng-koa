'use strict'
// Import Packages
const os = require('os')
const path = require('path')
const nconf = require('nconf')
const cache = require(path.join(__dirname, '../cache'))
const _ = require('lodash')
const winston = require('winston')

async function getAllRequests () {
  const requests = await cache.get('requests')
  return requests
}

async function getAllPastMinute () {
  const ts = parseInt(Date.now().toString().slice(0, 10)) - 60
  const requests = await cache.get('requests:count:' + ts.toString())
  return requests
}

async function getAllPastHour () {
  const ts = parseInt(Date.now().toString().slice(0, 10)) - 60 * 60
  const requests = await cache.get('requests:count:' + ts.toString())
  return requests
}

async function getAllPastDay () {
  const ts = parseInt(Date.now().toString().slice(0, 10)) - 60 * 60 * 24
  const requests = await cache.get('requests:count:' + ts.toString())
  return requests
}

async function getHosts () {
  const requests = await cache.get('requests:hosts')
  return requests
}

async function getHostsPastMinute () {
  const ts = parseInt(Date.now().toString().slice(0, 10)) - 60
  const requests = await cache.get('requests:hosts:count:' + ts.toString())
  return requests
}

async function getHostsPastHour () {
  const ts = parseInt(Date.now().toString().slice(0, 10)) - 60 * 60
  const requests = await cache.get('requests:hosts:count:' + ts.toString())
  return requests
}

async function getHostsPastDay () {
  const ts = parseInt(Date.now().toString().slice(0, 10)) - 60 * 60 * 24
  const requests = await cache.get('requests:hosts:count:' + ts.toString())
  return requests
}

async function getAllDayMap (now) {
  const ts = parseInt(Date.now().toString().slice(0, 10))
  const events = []
  for (let index = 1; index < 26; index++) {
    events.push(cache.get('requests:count:' + (ts - index * 60 * 60).toString()))
  }
  const result = await Promise.all(events)
  const data = []
  data.push(now - parseInt(result[0]))
  for (let index = 0; index < (result.length - 2); index++) {
    data.push(parseInt(result[index]) - parseInt(result[index + 1]))
  }
  return data
}

async function getHostsDayMap (limitHosts, now) {
  const ts = parseInt(Date.now().toString().slice(0, 10))
  const events = []
  for (let index = 1; index < 26; index++) {
    events.push(cache.get('requests:hosts:count:' + (ts - index * 60 * 60).toString()))
  }
  const result = await Promise.all(events)
  const data = {}
  for (let host of limitHosts) {
    const _ = result[0] ? now[host] - parseInt(result[0][host]) : 0
    data[host] = {}
    data[host].dayMap = []
    data[host].dayMap.push(_)
  }
  for (let index = 0; index < (result.length - 2); index++) {
    for (let host of limitHosts) {
      const _ = result[index] && result[index + 1] ? parseInt(result[index][host]) - parseInt(result[index + 1][host]) : null
      data[host].dayMap.push(_)
    }
  }
  return data
}

async function getPast5MinuteMap (now) {
  const ts = parseInt(Date.now().toString().slice(0, 10))
  const events = []
  for (let index = 1; index < 7; index++) {
    events.push(cache.get('requests:count:' + (ts - index * 60).toString()))
  }
  const result = await Promise.all(events)
  const data = []
  data.push(now - parseInt(result[0]))
  for (let index = 0; index < (result.length - 2); index++) {
    data.push(parseInt(result[index]) - parseInt(result[index + 1]))
  }
  return data
}
module.exports = async (ctx, next) => {
  const pkg = require(path.join('../../', 'package'))
  const fetchData = await Promise.all([
    // fetch All Requests
    getAllRequests(),
    getAllPastMinute(),
    getAllPastHour(),
    getAllPastDay(),
    // fetch hosts
    getHosts(),
    getHostsPastMinute(),
    getHostsPastHour(),
    getHostsPastDay()
  ])
  const all = {}
  all.now = fetchData[0]
  all.pastMinute = fetchData[1]
  all.pastHour = fetchData[2]
  all.pastDay = fetchData[3]

  let hosts = {}
  // Generate totals
  let limitHost = [
    // please add your own host
    'example.com'
  ]
  const HostToDelete = []
  for (let i of limitHost) {
    if (!fetchData[4][i]) {
      // if not exist
      winston.verbose(`host be removed: ${i}`)
      HostToDelete.push(i)
    } else {
      hosts[i] = {}
      hosts[i].total = fetchData[4][i]
      hosts[i].pastMinute = fetchData[5] ? parseInt(fetchData[4][i]) - parseInt(fetchData[5][i]) : null
      hosts[i].pastHour = fetchData[6] ? parseInt(fetchData[4][i]) - parseInt(fetchData[6][i]) : null
      hosts[i].pastDay = fetchData[7] ? parseInt(fetchData[4][i]) - parseInt(fetchData[7][i]) : null
    }
  }
  _.pullAll(limitHost, HostToDelete)
  // fetch DayMap
  const fetchDayMap = await Promise.all([
    getAllDayMap(all.now),
    getHostsDayMap(limitHost, fetchData[4]),
    getPast5MinuteMap(all.now)
  ])
  all.dayMap = fetchDayMap[0]
  all.FiveMinuteMap = fetchDayMap[2]
  // console.log(limitHost)
  for (let host of limitHost) {
    Object.assign(hosts[host], fetchDayMap[1][host])
  }
  // hosts = Object.assign({}, hosts, fetchDayMap[1])

  // get memory usage
  let memoryUsage = 0
  for (let v of Object.values(process.memoryUsage())) {
    memoryUsage += parseInt(v)
  }
  ctx.body = {
    name: pkg.name,
    version: pkg.version,
    message: 'Love us? donate at https://hitokoto.cn/donate',
    website: 'https://hitokoto.cn',
    server_id: nconf.get('api_name') ? nconf.get('api_name') : 'unallocated',
    server_status: {
      memory: {
        totol: os.totalmem() / (1024 * 1024),
        free: os.freemem() / (1024 * 1024),
        usage: memoryUsage / (1024 * 1024)
      },
      // cpu: os.cpus(),
      load: os.loadavg()
      /* hitokto: {
        total: global.hitokoto.total,
        categroy: global.hitokoto.categroy,
        lastUpdate: global.hitokoto.lastUpdated
      } */
    },
    requests: {
      all: {
        total: parseInt(all.now),
        pastMinute: parseInt(all.now) - parseInt(all.pastMinute),
        pastHour: parseInt(all.now) - parseInt(all.pastHour),
        pastDay: parseInt(all.now) - parseInt(all.pastDay),
        dayMap: all.dayMap,
        FiveMinuteMap: all.FiveMinuteMap
      },
      hosts
    },
    feedback: {
      Kuertianshi: 'i@loli.online',
      freejishu: 'i@freejishu.com',
      a632079: 'a632079@qq.com'
    },
    copyright: 'MoeCraft © ' + new Date().getFullYear() + ' All Rights Reserved. Powered by Teng-koa ( https://github.com/a632079/teng-koa ).',
    now: new Date(Date.now()).toString(),
    ts: Date.now()
  }
}
