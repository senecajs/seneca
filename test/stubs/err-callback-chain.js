'use strict'

var Seneca = require('../..')

Seneca()
  .add('a:1', function (m, d) {
    d(null, {x: 1})
  })
  .add('b:1', function (m, d) {
    this.act('a:1', d)
  })
  .act('b:1', function (e, r) {
    throw new Error('EC/b:1')
  })
