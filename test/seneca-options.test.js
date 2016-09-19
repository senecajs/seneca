'use strict'

var Seneca = require('..')

var Lab = require('lab')
var lab = exports.lab = Lab.script()
var describe = lab.describe
var it = lab.it
var after = lab.after
var Code = require('code')
var expect = Code.expect
var _ = require('lodash')

// Supported Seneca log levels are: `debug`, `info`, `warn`, `error`, `fatal`
// Seneca logging arguments:

// --seneca.log.quiet - no log output
// --seneca.log.silent - no log output

// --seneca.log.all - log everything, alias for `debug+` level
// --seneca.log.any - log everything, alias for `debug+` level
// --seneca.log.print - log everything, alias for `debug+` level

// --seneca.log.test alias for `error+` level
// --seneca.log.standard` alias for `info+` level

// Deprecated logging arguments:
// --seneca.log=plugin:foo bar // space works as val separator
// --seneca.log=level:info,type:plugin,handler:print

var initialEnv = process.argv
describe('seneca --seneca.log arguments tests', function () {
  after(function (done) {
    process.argv = initialEnv
    done()
  })

  it('--seneca.log=level:warn', function (done) {
    process.argv = ['', '', '--seneca.log=level:warn']
    var si = Seneca()
    expect(_.isMatch(si.export('options').log, { level: 'warn' })).to.be.true()

    done()
  })

  it('--seneca.log=level:warn+', function (done) {
    process.argv = ['', '', '--seneca.log=level:warn+']
    var si = Seneca()
    expect(_.isMatch(si.export('options').log, { level: 'warn+' })).to.be.true()

    done()
  })

  it('--seneca.log.level.warn', function (done) {
    process.argv = ['', '', '--seneca.log.level.warn']
    var si = Seneca()
    expect(_.isMatch(si.export('options').log, { level: 'warn' })).to.be.true()

    done()
  })

  it('--seneca.log.level.warn+', function (done) {
    process.argv = ['', '', '--seneca.log.level.warn+']
    var si = Seneca()
    expect(_.isMatch(si.export('options').log, { level: 'warn+' })).to.be.true()

    done()
  })

  it('duplicate param --seneca.log', function (done) {
    process.argv = ['', '', '--seneca.log=level:warn', '--seneca.log=level:error']
    var si = Seneca()
    expect(_.isMatch(si.export('options').log, { level: 'warn' })).to.be.true()

    done()
  })

  it('incorrect arg --seneca.log=level:', function (done) {
    process.argv = ['', '', '--seneca.log=level:']
    var si = Seneca()
    expect(_.isMatch(si.export('options').log, {})).to.be.true()

    done()
  })
})

describe('seneca --seneca.log aliases tests', function () {
  it('--seneca.log.quiet', function (done) {
    process.argv = ['', '', '--seneca.log.quiet']
    var si = Seneca()
    expect(_.isMatch(si.export('options').log, { level: 'quiet' })).to.be.true()

    done()
  })
  it('--seneca.log.silent', function (done) {
    process.argv = ['', '', '--seneca.log.silent']
    var si = Seneca()
    expect(_.isMatch(si.export('options').log, { level: 'silent' })).to.be.true()

    done()
  })
  it('--seneca.log.all', function (done) {
    process.argv = ['', '', '--seneca.log.all']
    var si = Seneca()
    expect(_.isMatch(si.export('options').log, { level: 'all' })).to.be.true()

    done()
  })
  it('--seneca.log.any', function (done) {
    process.argv = ['', '', '--seneca.log.any']
    var si = Seneca()
    expect(_.isMatch(si.export('options').log, { level: 'any' })).to.be.true()

    done()
  })
  it('--seneca.log.print', function (done) {
    process.argv = ['', '', '--seneca.log.print']
    var si = Seneca()
    expect(_.isMatch(si.export('options').log, { level: 'print' })).to.be.true()

    done()
  })
  it('--seneca.log.test', function (done) {
    process.argv = ['', '', '--seneca.log.test']
    var si = Seneca()
    expect(_.isMatch(si.export('options').log, { level: 'test' })).to.be.true()

    done()
  })
  it('--seneca.log.standard', function (done) {
    process.argv = ['', '', '--seneca.log.standard']
    var si = Seneca()
    expect(_.isMatch(si.export('options').log, { level: 'standard' })).to.be.true()

    done()
  })

  it('--seneca.log.level.quiet', function (done) {
    process.argv = ['', '', '--seneca.log.level.quiet']
    var si = Seneca()
    expect(_.isMatch(si.export('options').log, { level: 'quiet' })).to.be.true()

    done()
  })
  it('--seneca.log.level.silent', function (done) {
    process.argv = ['', '', '--seneca.log.level.silent']
    var si = Seneca()
    expect(_.isMatch(si.export('options').log, { level: 'silent' })).to.be.true()

    done()
  })
  it('--seneca.log.level.all', function (done) {
    process.argv = ['', '', '--seneca.log.level.all']
    var si = Seneca()
    expect(_.isMatch(si.export('options').log, { level: 'all' })).to.be.true()

    done()
  })
  it('--seneca.log.level.any', function (done) {
    process.argv = ['', '', '--seneca.log.level.any']
    var si = Seneca()
    expect(_.isMatch(si.export('options').log, { level: 'any' })).to.be.true()

    done()
  })
  it('--seneca.log.level.print', function (done) {
    process.argv = ['', '', '--seneca.log.level.print']
    var si = Seneca()
    expect(_.isMatch(si.export('options').log, { level: 'print' })).to.be.true()

    done()
  })
  it('--seneca.log.level.test', function (done) {
    process.argv = ['', '', '--seneca.log.level.test']
    var si = Seneca()
    expect(_.isMatch(si.export('options').log, { level: 'test' })).to.be.true()

    done()
  })
  it('--seneca.log.level.standard', function (done) {
    process.argv = ['', '', '--seneca.log.level.standard']
    var si = Seneca()
    expect(_.isMatch(si.export('options').log, { level: 'standard' })).to.be.true()

    done()
  })
})
