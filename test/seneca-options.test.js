'use strict'

var Seneca = require('..')

var Lab = require('lab')
var lab = exports.lab = Lab.script()
var describe = lab.describe
var it = lab.it
var Code = require('code')
var expect = Code.expect
var _ = require('lodash')

// Supported log levels are: `debug`, `info`, `warn`, `error`, `fatal`
// The default logging level is `info+`

// Seneca logging arguments:

// --seneca.log.quiet - no log output
// --seneca.log.silent - no log output

// --seneca.log.all - log everything, alias for `debug+` level
// --seneca.log.print - log everything, alias for `debug+` level

// --seneca.log.test alias for `error+` level
// --seneca.log.standard` alias for `info+` level

// Deprecated logging arguments:
// --seneca.log=plugin:foo bar // space works as val separator
// --seneca.log=level:info,type:plugin,handler:print

describe('seneca --seneca.log arguments tests', function () {
// Minimist parsing results:
// $ node index --seneca.log=level:warn
// { seneca: { log: 'level:warn' } }
// $ node index --seneca.log=level:warn+
// seneca: { log: 'level:warn+' }
// $ node index --seneca.log.level.warn+
// seneca:{log:{level:{warn+:true}}}
// $ node index -l level:warn+
// seneca: { log: 'level:warn+' }

  it('--seneca.log=level:warn', function (done) {
    process.argv = ['', '', '--seneca.log=level:warn']
    var si = Seneca()
    expect(_.isEqual(si.export('options').log, { level: 'warn' })).to.be.true()

    done()
  })

  it('--seneca.log=level:warn+', function (done) {
    process.argv = ['', '', '--seneca.log=level:warn+']
    var si = Seneca()
    expect(_.isEqual(si.export('options').log, { level: 'warn+' })).to.be.true()

    done()
  })

  it('--seneca.log.level.warn', function (done) {
    process.argv = ['', '', '--seneca.log.level.warn']
    var si = Seneca()
    expect(_.isEqual(si.export('options').log, { level: 'warn' })).to.be.true()

    done()
  })

  it('--seneca.log.level.warn+', function (done) {
    process.argv = ['', '', '--seneca.log.level.warn+']
    var si = Seneca()
    expect(_.isEqual(si.export('options').log, { level: 'warn+' })).to.be.true()

    done()
  })

  // it('-l level:warn', function (done) {
  //   done()
  // })
})

describe('seneca --seneca.log aliases tests', function () {
  it('--seneca.log.quiet', function (done) {
    process.argv = ['', '', '--seneca.log.level.quiet']
    var si = Seneca()
    expect(_.isEqual(si.export('options').log, { level: 'quiet' })).to.be.true()

    done()
  })
  it('--seneca.log.silent', function (done) {
    process.argv = ['', '', '--seneca.log.level.silent']
    var si = Seneca()
    expect(_.isEqual(si.export('options').log, { level: 'silent' })).to.be.true()

    done()
  })
  it('--seneca.log.all', function (done) {
    process.argv = ['', '', '--seneca.log.level.all']
    var si = Seneca()
    expect(_.isEqual(si.export('options').log, { level: 'all' })).to.be.true()

    done()
  })
  it('--seneca.log.print', function (done) {
    process.argv = ['', '', '--seneca.log.level.print']
    var si = Seneca()
    expect(_.isEqual(si.export('options').log, { level: 'print' })).to.be.true()

    done()
  })
  it('--seneca.log.test', function (done) {
    process.argv = ['', '', '--seneca.log.level.test']
    var si = Seneca()
    expect(_.isEqual(si.export('options').log, { level: 'test' })).to.be.true()

    done()
  })
  it('--seneca.log.standard', function (done) {
    process.argv = ['', '', '--seneca.log.level.standard']
    var si = Seneca()
    expect(_.isEqual(si.export('options').log, { level: 'standard' })).to.be.true()

    done()
  })
})
