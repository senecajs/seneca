'use strict'

var Seneca = require('../..')
var seneca = Seneca()

seneca.add({role: 'math', cmd: 'sum'}, function (args, callback) {
  var sum = args.left + args.right
  callback(null, {answer: sum})
})

seneca.act({role: 'math', cmd: 'sum', left: 1, right: 2}, function (err, result) {
  if (err) return console.error(err)
  console.log(result)
})

seneca.add({role: 'math', cmd: 'product'}, function (args, callback) {
  var product = args.left * args.right
  callback(null, {answer: product})
})

seneca.act({role: 'math', cmd: 'product', left: 3, right: 4}, function (err, result) {
  if (err) return console.error(err)
  console.log(result)
})

function print (err, result) { console.log(result, err) }

var math = seneca.pin({role: 'math', cmd: '*'})
math.sum({left: 1, right: 2}, print)
math.product({left: 3, right: 4}, print)
