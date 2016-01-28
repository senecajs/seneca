'use strict'

var Connect = require('connect')
var Seneca = require('../..')
var seneca = Seneca()

seneca.add({role: 'math', cmd: 'product'}, function (args, callback) {
  var product = args.left * args.right
  callback(null, {answer: product})
})

seneca.use('transport')

Connect()
  .use(Connect.json())
  .use(seneca.service())
  .listen(10171)
