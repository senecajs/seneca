
'use strict'


// Plugin load order is important. What handler is called when two or more
// are added for a single message is dependent on the order in which the
// handler's parent plugin was loaded. This is demonstrated below.


var Seneca = require('../../')
var Assert = require('assert')

function one () {
  var seneca = this

  seneca.add('cmd:run', (msg, done) => {
    return done(null, {handler: 'one'})
  })
}

function two () {
  var seneca = this

  seneca.add('cmd:run', (msg, done) => {
    done(null, {handler: 'two'})
  })
}


// Load order significanc means the plugin
// that loads last is the one that handles
// the message.


var ordered =
  Seneca()
    .use(one)
    .use(two)

var reversed =
Seneca()
  .use(two)
  .use(one)


// In each case below the handler that
// is loaded last is always the one to
// handle the message.


ordered.ready((err) => {
  ordered.act('cmd:run', (err, reply) => {
    Assert((reply.handler === 'two'))
    console.log(reply)
  })
})

reversed.ready((err) => {
  reversed.act('cmd:run', (err, reply) => {
    Assert((reply.handler === 'one'))
    console.log(reply)
  })
})


// Output
// { handler: 'two' }
// { handler: 'one' }
