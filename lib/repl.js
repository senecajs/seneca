/* Copyright (c) 2010-2015 Richard Rodger, MIT License */
'use strict'

var Net = require('net')
var Repl = require('repl')
var Util = require('util')
var Vm = require('vm')
var _ = require('lodash')
var Jsonic = require('jsonic')


var internals = {
  defaults: {
    port: 30303,
    host: '127.0.0.1'
  }
}

module.exports = function (options) {
  var seneca = this
  var settings = seneca.util.deepextend(internals.defaults, options)

  var repl = internals.repl(seneca, settings)

  seneca.decorate('repl', repl) // Open a REPL on a local port.
  seneca.decorate('startrepl', repl)

  return {
    name: 'repl',
    options: settings
  }
}

internals.repl = function (seneca, settings) {
  return function api_repl () {
    var self = this

    var in_opts = _.isObject(arguments[0]) ? in_opts : {}
    in_opts.port = _.isNumber(arguments[0]) ? arguments[0] : in_opts.port
    in_opts.host = _.isString(arguments[1]) ? arguments[1] : in_opts.host

    var repl_opts = seneca.util.deepextend(settings, in_opts)

    Net.createServer(function (socket) {
      socket.on('error', function (err) {
        sd.log.error('repl-socket', err)
      })

      var r = Repl.start({
        prompt: 'seneca ' + seneca.id + '> ',
        input: socket,
        output: socket,
        terminal: false,
        useGlobal: false,
        eval: evaluate
      })

      r.on('exit', function () {
        socket.end()
      })

      var act_index_map = {}
      var act_index = 1000000
      function fmt_index (i) {
        return ('' + i).substring(1)
      }

      var sd = seneca.delegate({ repl$: true })

      r.on('error', function (err) {
        sd.log.error('repl', err)
      })

      sd.on_act_in = function on_act_in (actmeta, args) {
        socket.write('IN  ' + fmt_index(act_index) +
                     ': ' + Util.inspect(sd.util.clean(args)) +
                     ' # ' +
                     args.meta$.id + ' ' +
                     actmeta.pattern + ' ' +
                     actmeta.id + ' ' +
                     actmeta.func.name + ' ' +
                     (actmeta.callpoint ? actmeta.callpoint : '') +
                     '\n')
        act_index_map[actmeta.id] = act_index
        act_index++
      }

      sd.on_act_out = function on_act_out (actmeta, out) {
        out = (out && out.entity$) ? out : Util.inspect(sd.util.clean(out))

        var cur_index = act_index_map[actmeta.id]
        socket.write('OUT ' + fmt_index(cur_index) +
          ': ' + out + '\n')
      }

      sd.on_act_err = function on_act_err (actmeta, err) {
        var cur_index = act_index_map[actmeta.id]
        socket.write('ERR ' + fmt_index(cur_index) +
          ': ' + err.message + '\n')
      }

      r.context.s = r.context.seneca = sd

      function evaluate (cmd, context, filename, callback) {
        var result

        cmd = cmd.replace(/[\r\n]+$/, '')

        if (cmd === 'quit' || cmd === 'exit') {
          socket.end()
        }

        try {
          var args = Jsonic(cmd)
          context.s.act(args, function (err, out) {
            if (err) {
              return callback(err.message)
            }

            return callback(null, (out && out.entity$) ? out : seneca.util.clean(out))
          })
        }
        catch (e) {
          try {
            var script = Vm.createScript(cmd, {
              filename: filename,
              displayErrors: false
            })
            result = script.runInContext(context, { displayErrors: false })

            result = (result === seneca) ? null : result
            callback(null, result)
          }
          catch (e) {
            return callback(e.message)
          }
        }
      }
    }).listen(repl_opts.port, repl_opts.host)

    return self
  }
}
