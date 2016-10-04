'use strict'

var Seneca = require('../..')

Seneca()
  .add('a:1', function (m, d) { d(null, {x: 1}) })
  .sub('a:1', console.log)
  .act('a:1', console.log)
