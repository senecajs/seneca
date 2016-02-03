'use strict'

var Http = require('http')
var Code = require('code')
var Connect = require('connect')
var Lab = require('lab')
var Seneca = require('../')

var lab = exports.lab = Lab.script()
var describe = lab.describe
var it = lab.it
var expect = Code.expect


describe('connect', function () {
  it('can route to actions using pinning after seneca is ready', function (done) {
    var seneca = Seneca({ log: 'silent' })
    seneca.add({ role: 'test', cmd: 'foo' }, function (args, cb) {
      cb(null, { foo: 'bar' })
    })

    var app = Connect()
    app.use(seneca.export('web'))

    seneca.ready(function () {
      seneca.act({
        role: 'web',
        use: {
          prefix: '/test',
          pin: { role: 'test', cmd: '*' },
          map: {
            foo: {
              GET: true
            }
          }
        }
      })

      var server = Http.createServer(app)
      server.once('listening', function () {
        var port = server.address().port

        Http.get('http://localhost:' + port + '/test/foo', function (res) {
          expect(res.statusCode).to.equal(200)
          done()
        })
      })
      server.listen(0)
    })
  })

  it('can route to actions using pinning before seneca is ready, make a request after seneca is ready', function (done) {
    var seneca = Seneca({ log: 'silent' })
    seneca.add({ role: 'test', cmd: 'foo' }, function (args, cb) {
      cb(null, { foo: 'bar' })
    })

    seneca.act({
      role: 'web',
      use: {
        prefix: '/test',
        pin: { role: 'test', cmd: '*' },
        map: {
          foo: {
            GET: true
          }
        }
      }
    })

    var app = Connect()
    app.use(seneca.export('web'))

    var server = Http.createServer(app)
    server.once('listening', function () {
      var port = server.address().port
      seneca.ready(function () {
        Http.get('http://localhost:' + port + '/test/foo', function (res) {
          expect(res.statusCode).to.equal(200)
          done()
        })
      })
    })
    server.listen(0)
  })
})
