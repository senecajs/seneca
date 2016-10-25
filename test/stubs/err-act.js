'use strict'

var Seneca = require('../..')

var seneca = Seneca().test()

seneca
  .add('a:1', function (m, d) {
    d(new Error('E/a:1'))
  })

if ('listen' === process.argv[2]) {
  seneca.listen()
}
else {
  seneca.act('a:1', console.log)
}
