'use strict'

require('../..')()
  .add('a:1', function (msg, done) {
    done(null, {a: 1, x: msg.x})
  })
  .add('b:2', function (msg, done) {
    done(null, {b: 2, x: msg.x})
  })

  .add('role:transport,cmd:listen', function (msg, done) {
    console.log(msg.config)
    this.prior(msg, done)
  })

  .listen({pin: 'a:1'})
