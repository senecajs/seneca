'use strict'

var Seneca = require('../..')

var seneca = Seneca()

seneca
  .add('a:1', function (m, d) {
    d(null, {x: 1})
  })

if ('listen' === process.argv[2]) {
  seneca.listen()
}
else {
  seneca
    .act('a:1', function (e, r) {
      throw new Error('EC/a:1')
    })
}

