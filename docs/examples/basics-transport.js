'use strict'

// Using seneca's transport mechanism enables you to split
// business logic into discrete microservices. Features like
// priors work over the network as does load behaviour. See
// it in action below.

var Seneca = require('../..')
var Assert = require('assert')

// Some variables so we can Assert things are
//happening in the order we expect them too.
var index = 0
var tags = [
  'none',
  'approver',
  'rejector'
]

// Our little reusable business logic is basically a factory
// that returns a method with the same signature as seneca.add.
// Each business logic factory echos it's tag when called.
function businessLogic (tag) {
  return function (msg, done) {
    return done(null, {tag: tag})
  }
}


// Our 'local' plugin will always handle the message first
// because we load it last. But it also uses a prior to see
// if anyone else before it handles the message.
function local (msg, done) {
  this.prior(msg, (err, reply) => {
    return done(null, {tag: reply ? reply.tag : 'none'})
  })
}


// Our logger makes order assertions and prints
// the result of each of the 3 calls we make.
function logger (err, reply) {
  Assert(!err)
  Assert(reply.tag == tags[index])
  index++

  console.log(reply)
}


// Our first server is set up to emit 'approver' when
// it is called. It shows how to explicitly set listener
// options. This micrservice 'listens' on http for `cmd:*`.
Seneca()
  .add('cmd:run', businessLogic('approver'))
  .listen({type: 'http', port: '8260', pin: 'cmd:*'})


// Our sencond service is set up to emit 'rejector' when
// it is called. This service only specifies the port. It
// is provided defaults of http for type and * for pin.
Seneca()
  .add('cmd:run', businessLogic('rejector'))
  .listen(8270)


// Our first tester runs only the local plugin. The expected
// result is 'none' as it is the default for the local plugin.
Seneca()
  .add('cmd:run', local)
  .act('cmd:run', logger)


// Our second tester runs the local plugin and makes two client
// connections (defaulted to http). Clients follow load order,
// as such local is first called which then uses prior to call
// to the 'approver' service which prints 'approver'.
Seneca()
  .client({port: 8270, pin: 'cmd:run'})
  .client({port: 8260, pin: 'cmd:run'})
  .add('cmd:run', local)
  .act('cmd:run', logger)

// Out last tester runs the reverse of the one appove. This
// changes the prior selected which prints 'rejector' instead.
Seneca()
  .client({port: 8260, pin: 'cmd:run'})
  .client({port: 8270, pin: 'cmd:run'})
  .add('cmd:run', local)
  .act('cmd:run', logger)


// An important point to note. Why didn't prior fire a second time
// in each instance? This is because prior only affects the first
// client. Since the second call in each instance hits a server with
// no local prior, the chain is satisfied.


// Auto stop our test after half a second.
setTimeout(() => {process.exit()}, 500)


// Prints
// { businessLogic: 'none' }
// { businessLogic: 'approver' }
// { businessLogic: 'rejector' }
