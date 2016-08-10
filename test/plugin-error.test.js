'use strict'

var Code = require('code')
var Lab = require('lab')
var Seneca = require('..')

// Test shortcuts
var lab = exports.lab = Lab.script()
var describe = lab.describe
var it = lab.it
var expect = Code.expect

describe('plugin-service-error', function () {
  var si

  lab.before(function (done) {
    si = Seneca({ log: 'silent' })
      .use('./plugin-error/tmp.js')
      .listen({ type: 'tcp', port: '30010', pin: 'role:tmp' })
      .ready(done)
  })

  it('should return "no errors created." when passing test false', function (done) {
    var seneca = Seneca({ log: 'silent' })
    seneca.use('./plugin-error/tmpApi')
    seneca.client({ type: 'tcp', port: '30010', pin: 'role:tmp' })

    seneca.act({ role: 'api', cmd: 'tmpQuery', test: 'false' }, function (err, res) {
      expect(err).to.not.exist()
      expect(res.message).to.contain('no errors created.')
      seneca.close(done)
    })
  })

  it('should return "error caught!" when passing test true', function (done) {
    var seneca = Seneca({ log: 'silent' })
    seneca.use('./plugin-error/tmpApi')
    seneca.client({ type: 'tcp', port: '30010', pin: 'role:tmp' })

    seneca.act({ role: 'api', cmd: 'tmpQuery', test: 'true' }, function (err, res) {
      expect(err).to.not.exist()
      expect(res.message).to.contain('error caught!')
      seneca.close(done)
    })
  })

  lab.after(function (done) {
    si.close(done)
  })
})
