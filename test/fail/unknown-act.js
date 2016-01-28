'use strict'

var Seneca = require('../..')
var seneca = Seneca()

seneca.act({a: 1}, function (err) {
  console.log(err)
})
