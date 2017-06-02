var aI = 0

//var memwatch = require('memwatch-next')
//memwatch.on('leak', console.log)

var max = parseInt(process.argv[2 + aI], 10)
var duration = parseInt(process.argv[3 + aI], 10) * 1000
var version = process.argv[4 + aI]
var local = 'local' === process.argv[5 + aI]

console.log(max, duration, version, local)


var Seneca = require(version === 'old' ? '../../seneca-main' : '..')

var stats = {
  sent: 0,
  err: 0,
  pass: 0,
  fail: 0
}

var calltimes = []

var x = 0

function send(seneca, next) {
  var y = x++
  stats.sent++
  var dur_start = process.hrtime()

  seneca.act({ a: 1, x: y }, function(err, out) {
    var dur_diff = process.hrtime(dur_start)
    calltimes.push(parseInt(dur_diff[0] * 1e9 + dur_diff[1], 10))

    if (err) {
      stats.err++
      return next(true)
    }

    if (y === out.x) {
      stats.pass++
    } else {
      stats.fail++
    }
    next(true)
  })
}

function finish(active) {
  stats.active = active

  stats.avgcall = Math.floor(
    calltimes.reduce(function(acc, elm) {
      return acc + elm
    }, 0) / calltimes.length
  )

  calltimes.sort(function(a, b) {
    return a - b
  })

  stats.callmin = calltimes[0]
  stats.callmax = calltimes[calltimes.length - 1]
  stats.call90p = calltimes[Math.floor(0.9 * calltimes.length)]

  console.dir(stats, { colors: true })

  require('fs').writeFileSync('./calltimes.csv', 'ct\n' + calltimes.join('\n'))

  si.close(function() {
    var ph =
      'S,E\n' + si.private$.history._prunehist.map(x => x.join(',')).join('\n')
    require('fs').writeFileSync('./prune.csv', ph)
  })
}

var si = Seneca({
  timeout: 1111,
  status: {
    running: false,
    interval: 500
  },
  legacy: {
    transport: 'old' === version 
  }
})
//.test('print')

if (local) {
  si.add({ a: 1 }, function(msg, reply) {
    reply({ x: msg.x })
  })
} else {
  si.client()
}

si.ready(function() {
  var seneca = this

  var start = Date.now()
  var active = 0
  var finished = false

  var next = function(isresponse) {
    if (finished) {
      return
    }

    active = active - (isresponse ? 1 : 0)

    setImmediate(function() {
      if (!finished && duration <= Date.now() - start) {
        finished = true
        finish(active)
      } else if (active < max) {
        while (active < max) {
          send(seneca, next)
          active++
        }
      }
    })
  }

  next()
})
