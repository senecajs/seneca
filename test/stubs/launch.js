'use strict'

var Seneca = require('../..')

var start = Date.now()

Seneca()
  .use('./foo-plugin.js')
  .add('a:1', function (msg, reply) {
    reply({x: 1})
  })
  .ready(function () {
    console.log('start time: ' + (Date.now() - start))
  })
  .act('a:1', Seneca.util.print)
  .act('b:2', Seneca.util.print)
