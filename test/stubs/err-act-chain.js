'use strict'

var Seneca = require('../..')

var seneca = Seneca()

seneca
  .add('a:1', function (m, d) {
    d(new Error('E/a:1'))
  })
  .add('b:1', function (m, d) {
    this.act('a:1', d)
  })

if ('listen' === process.argv[2]) {
  seneca.listen()
}
else {
  seneca.act('b:1', console.log)
}
