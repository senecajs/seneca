'use strict'

var Seneca = require('../..')

// The logger below prints super condensed logs. It is useful
// for checking call orders and pattern movements when debugging.

function Logger () {}

// Loggers are loaded via a `preload` function. This is a way
// to signal seneca infrastructural plugins over business logic
// plugins, which get loaded later in the chain.
Logger.preload = function () {
  var seneca = this

  // Leftpad, AMIRITE
  function pad (content, length) {
    content = content || ''

    while (content.length < length) {
      content = content + ' '
    }

    return content
  }

  // Everything something is logged it calls whatever
  // custom adapter is set. Adapters are passed the
  // current instance of Seneca plus the raw payload.
  function adapter (context, payload) {
    var when = payload.when.toString()
    var kind = pad(payload.kind || '-', 8).toUpperCase()
    var type = pad(payload.case || '-', 8).toUpperCase()
    var text = payload.pattern || payload.notice || '-'

    console.log(when, kind, type, text)
  }

  // Seneca looks for logging adapters in `extend.logger`
  // simply assign your adapter to receive the logs.
  return {
    extend: {
      logger: adapter
    }
  }
}

// To load a logger plugin, you MUST load it via
// options passed to seneca. Loggers need to be loaded
// right at the start of execution. Using .use(Logger)
// is not supported.
var instance =
Seneca({
  internal: {
    logger: Logger
  }
})

// Prints
// <Timestamp> <kind> <case> <pattern>
// ...
// 1473416085466 ADD      ADD      cmd:stats,role:seneca
// 1473416085481 ADD      ADD      cmd:close,role:seneca
// 1473416085482 ADD      ADD      info:fatal,role:seneca
// 1473416085482 ADD      ADD      get:options,role:seneca
// 1473416085483 ADD      ADD      role:seneca,stats:true
// 1473416085484 ADD      ADD      cmd:get,role:options
// 1473416085484 NOTICE   -        hello
// 1473416085485 NOTICE   -        -
// 1473416085540 ADD      ADD      name:transport,plugin:define,role:seneca
// 1473416085544 ACT      IN       name:transport,plugin:define,role:seneca
// 1473416085545 PLUGIN   INIT     name:transport,plugin:define,role:seneca
// 1473416085548 ADD      ADD      cmd:inflight,role:transport
// 1473416085549 ADD      ADD      cmd:listen,role:transport
// 1473416085550 ADD      ADD      cmd:client,role:transport
// 1473416085552 ADD      ADD      hook:listen,role:transport,type:tcp
// 1473416085553 ADD      ADD      hook:client,role:transport,type:tcp
// 1473416085554 ADD      ADD      hook:listen,role:transport,type:web
// 1473416085555 ADD      ADD      hook:client,role:transport,type:web
// 1473416085555 ADD      ADD      hook:listen,role:transport,type:http
// 1473416085556 ADD      ADD      hook:client,role:transport,type:http
// 1473416085557 ADD      ADD      hook:listen,role:transport,type:direct
// 1473416085558 ADD      ADD      hook:client,role:transport,type:direct
// ...
