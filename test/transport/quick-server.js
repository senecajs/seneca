'use strict'

require('../..')()
  .add('a:1', function (msg, done) {
    done(null, {a: 1, x: msg.x})
  })
  .listen()
