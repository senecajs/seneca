var Net = require('net')
var Repl = require('repl')
var Util = require('util')
var Vm = require('vm')
var _ = require('lodash')
var Jsonic = require('jsonic')

module.exports = function (root, so) {
  return function api_repl () {
    var self = this

    var in_opts = _.isObject(arguments[0]) ? in_opts : {}
    in_opts.port = _.isNumber(arguments[0]) ? arguments[0] : in_opts.port
    in_opts.host = _.isString(arguments[1]) ? arguments[1] : in_opts.host

    var repl_opts = _.extend(so.repl, in_opts)

    Net.createServer(function (socket) {
      socket.on('error', function (err) {
        sd.log.error('repl-socket', err)
      })

      var r = Repl.start({
        prompt: 'seneca ' + root.id + '> ',
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

      var sd = root.delegate({ repl$: true })

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

            return callback(null, (out && out.entity$) ? out : root.util.clean(out))
          })
        }
        catch (e) {
          try {
            var script = Vm.createScript(cmd, {
              filename: filename,
              displayErrors: false
            })
            result = script.runInContext(context, { displayErrors: false })

            result = (result === root) ? null : result
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
