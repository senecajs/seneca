'use strict'

var Seneca = require('../../')


// Functionality in seneca is composed into simple
// plugins that can be loaded into seneca instances.


function rejector () {
  this.add('cmd:run', (msg, done) => {
    return done(null, {tag: 'rejector'})
  })
}

function approver () {
  this.add('cmd:run', (msg, done) => {
    return done(null, {tag: 'approver'})
  })
}

function local () {
  this.add('cmd:run', function (msg, done) {
    this.prior(msg, (err, reply) => {
      return done(null, {tag: reply ? reply.tag : 'local'})
    })
  })
}


// Services can listen for messages using a variety of
// transports. In process and http are included by default.


Seneca()
  .use(approver)
  .listen({type: 'http', port: '8260', pin: 'cmd:*'})

Seneca()
  .use(rejector)
  .listen(8270)


// Load order is important, messages can be routed
// to other services or handled locally. Pins are
// basically filters over messages


function handler (err, reply) {
  console.log(err, reply)
}

Seneca()
  .use(local)
  .act('cmd:run', handler)

Seneca()
  .client({port: 8270, pin: 'cmd:run'})
  .client({port: 8260, pin: 'cmd:run'})
  .use(local)
  .act('cmd:run', handler)

Seneca()
  .client({port: 8260, pin: 'cmd:run'})
  .client({port: 8270, pin: 'cmd:run'})
  .use(local)
  .act('cmd:run', handler)


// Output
// null { tag: 'local' }
// null { tag: 'approver' }
// null { tag: 'rejector' }
