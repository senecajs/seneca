'use strict'

var Seneca = require('../../')

var local = Seneca({log: 'test'})
var server = Seneca({log: 'test'})

var plugin = function () {
  this.add('role:cause,cmd:err', (msg, done) => {
    throw new Error('foo')
    done()
  })
}


server
  .use(plugin)
  .ready(() => {

    server.listen({pin: 'role:cause,cmd:*', port: 4050})

    local.ready(() => {

      local.client({pin: 'role:cause,cmd:*', port: 4050})
      setInterval(() => {
        local.act('role:cause,cmd:err', (err, reply) => {
          console.log(err)
        })

      }, 1000)
    })
  })
