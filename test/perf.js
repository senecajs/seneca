// Defaults, single process: node perf.js
// Message count, single process: node perf.js '' both 20000
// Server, specific host: node perf.js '0.0.0.0' server
// Client, specific host, message count: node perf.js '192.168.N.N' client 30000

const Summary = require('summary')
const Seneca = require('../seneca')

const HOST = process.argv[2] || '127.0.0.1'
const MODE = process.argv[3] || 'both' // client|server|both
const TOTAL = process.argv[4] || 1000

const TIMEOUT = 9999
const LEGACY = false
const VALIDATE = false
const HISTORY = false
const SILENT = true

const serverActive = 'both' === MODE || 'server' === MODE
const clientActive = 'both' === MODE || 'client' === MODE

const fakeSeneca = {
  ready: (fn) => fn(),
  close: (fn) => fn(),
  stats: () => 'none',
}

let s0 = fakeSeneca

if (serverActive) {
  s0 = Seneca({
    legacy: LEGACY,
    tag: 's0',
    close_delay: 0,
    death_delay: 0,
    timeout: TIMEOUT,
    log: SILENT ? 'silent' : { logger: 'flat', level: 'warn' },
    history: { active: HISTORY },
    valid: { active: VALIDATE },
  })
    // .test()
    .add('a:1', { x: Number, y: { z: Boolean } }, function (msg, reply) {
      reply({ x: 1 + msg.x })
    })
    .listen({ host: HOST, port: 40404 })
}

let c0 = fakeSeneca

if (clientActive) {
  c0 = Seneca({
    legacy: LEGACY,
    tag: 'c0',
    close_delay: 0,
    death_delay: 0,
    timeout: TIMEOUT,
    log: SILENT ? 'silent' : { logger: 'flat', level: 'warn' },
    history: { active: HISTORY },
    valid: { active: VALIDATE },
  })
    // .test()
    .client({ host: HOST, port: 40404 })
}

let top = {
  started: 0,
  finished: 0,
  pass: 0,
  fail: 0,
  passdur: [],
  faildur: [],
}

s0.ready(function () {
  c0.ready(function () {
    if (clientActive) {
      let begin = Date.now()
      function run() {
        if (top.started < TOTAL) {
          top.started++

          let start = Date.now()
          c0.act('a:1', { x: 11, y: { z: true } }, function (err, out) {
            let end = Date.now()

            top.finished++
            if (0 === top.finished % 5000) {
              console.log(top.finished + '...')
            }

            if (out && 12 === out.x) {
              top.pass++
              top.passdur.push(end - start)
            } else {
              top.fail++
              top.faildur.push(end - start)
            }

            if (TOTAL <= top.finished) {
              if (clientActive) {
                report(s0, c0)
              }
            }
          })

          setImmediate(run)
        }
      }

      run()
    }
  })
})

function report(s0, c0) {
  // ,duration) {
  c0.close(() => {
    console.log('close', 'c0')
    s0.close(() => {
      console.log('close', 's0')
      console.log('basic', TOTAL)
      console.log('top', {
        // duration: duration,
        started: top.started,
        finished: top.finished,
        pass: top.pass,
        fail: top.fail,
        passdurlen: top.passdur.length,
        faildurlen: top.faildur.length,
      })

      let summary = Summary(top.passdur)
      console.log('pass mode:', summary.mode())
      console.log('pass mean:', summary.mean())
      console.log('pass median:', summary.median())
      console.log('pass percentile 25:', summary.quartile(0.25))
      console.log('pass percentile 50:', summary.quartile(0.5))
      console.log('pass percentile 75:', summary.quartile(0.75))
      console.log('pass percentile 90:', summary.quartile(0.9))
      console.log('pass percentile 95:', summary.quartile(0.95))
      console.log('pass percentile 99:', summary.quartile(0.99))
      console.log('pass variance:', summary.variance())
      console.log('pass sd:', summary.sd())
      console.log('pass max:', summary.max())
      console.log('pass min:', summary.min())

      let failsummary = Summary(top.faildur)
      console.log('fail mean:', failsummary.mean())

      console.log('s0', s0.stats())
      console.log('c0', c0.stats())
    })
  })
}
