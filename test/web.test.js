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
  it('can route to actions', function (done) {
    var seneca = Seneca({ log: 'silent' })
    seneca.add({ role: 'api', cmd: 'foo' }, function (args, cb) {
      cb(null, { foo: 'bar' })
    })

    seneca.use(function () {
      seneca.act({ role: 'web' }, { use: {
        prefix: '/test',
        pin: { role: 'api', cmd: '*' },
        map: {
          foo: {
            GET: true
          }
        }
      } })
    })

    var app = Connect()
    app.use(seneca.export('web'))

    var server = Http.createServer(app)
    server.once('listening', function () {
      var port = server.address().port

      Http.get('http://localhost:' + port + '/test/foo', function (res) {
        expect(res.statusCode).to.equal(200)
        res.pipe(process.stdout)
        done()
      })
    })
    server.listen(0)
  })
})
