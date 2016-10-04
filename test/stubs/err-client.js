'use strict'

var Seneca = require('../..')

var seneca = Seneca()

seneca
  .client()
  .act(process.argv[2], function () {
    if ('callback' === process.argv[3]) {
      throw new Error('EC/client')
    }
    else {
      console.log(arguments)
    }
  })
