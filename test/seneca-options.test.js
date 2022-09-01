/* Copyright (c) 2017 Richard Rodger, MIT License */
'use strict'

const Lab = require('@hapi/lab')
var lab = (exports.lab = Lab.script())
var describe = lab.describe
const Code = require('@hapi/code')
var expect = Code.expect

var Shared = require('./shared')
var it = Shared.make_it(lab)

var Seneca = require('..')

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

describe('seneca --seneca.log arguments tests: ', function () {
  it('--seneca.log=level:warn', function (done) {
    var opts = { debug: {} }
    opts.debug.argv = ['', '', '--seneca.log=level:warn']
    var si = Seneca(opts)

    expect(si.options().log).contains({ level: 'warn' })

    done()
  })

  it('--seneca.log=level:warn+', function (done) {
    var opts = { debug: {} }
    opts.debug.argv = ['', '', '--seneca.log=level:warn+']
    var si = Seneca(opts)
    expect(si.export('options').log).includes({ level: 'warn+' })

    done()
  })

  it('--seneca.log.level.warn', function (done) {
    var opts = { debug: {} }
    opts.debug.argv = ['', '', '--seneca.log.level.warn']
    var si = Seneca(opts)
    expect(si.export('options').log).includes({ level: 'warn' })

    done()
  })

  it('--seneca.log.level.warn+', function (done) {
    var opts = { debug: {} }
    opts.debug.argv = ['', '', '--seneca.log.level.warn+']
    var si = Seneca(opts)
    expect(si.export('options').log).includes({ level: 'warn+' })

    done()
  })

  it('duplicate param --seneca.log', function (done) {
    var opts = { debug: {} }
    opts.debug.argv = [
      '',
      '',
      '--seneca.log=level:warn',
      '--seneca.log=level:error',
    ]
    var si = Seneca(opts)
    expect(si.export('options').log).includes({ level: 'warn' })

    done()
  })

  it('incorrect arg --seneca.log=level:', function (fin) {
    var opts = { debug: {} }
    opts.debug.argv = ['', '', '--seneca.log=level:']
    try {
      Seneca(opts)
      Code.fail()
    } catch (e) {
      console.log(e)
      expect(e.code).equal('bad_logspec_string')
      fin()
    }

    done()
  })

  it('incorrect arg --seneca.log.level.abc', function (done) {
    var opts = { debug: {} }
    opts.debug.argv = ['', '', '--seneca.log.level.abc']
    var si = Seneca(opts)
    expect(si.export('options').log).includes({ level: 'abc' })

    done()
  })

  it('incorrect arg --seneca.log.abc', function (done) {
    var opts = { debug: {} }
    opts.debug.argv = ['', '', '--seneca.log.abc']
    var si = Seneca(opts)
    expect(si.export('options').log).includes({ level: 'abc' })

    done()
  })
})

describe('seneca --seneca.log aliases tests: ', function () {
  it('--seneca.log.quiet', function (done) {
    var opts = { debug: {} }
    opts.debug.argv = ['', '', '--seneca.log.quiet']
    var si = Seneca(opts)
    expect(si.export('options').log).includes({ level: 'quiet' })

    done()
  })
  it('--seneca.log.silent', function (done) {
    var opts = { debug: {} }
    opts.debug.argv = ['', '', '--seneca.log.silent']
    var si = Seneca(opts)
    expect(si.export('options').log).includes({ level: 'silent' })

    done()
  })
  it('--seneca.log.all', function (done) {
    var opts = { legacy: false, debug: {} }
    opts.debug.argv = ['', '', '--seneca.log.all']
    var si = Seneca(opts)
    expect(si.export('options').log).includes({ level: 'all' })

    done()
  })
  it('--seneca.log.any', function (done) {
    var opts = { legacy: false, debug: {} }
    opts.debug.argv = ['', '', '--seneca.log.any']
    var si = Seneca(opts)
    expect(si.export('options').log).includes({ level: 'any' })

    done()
  })
  it('--seneca.log.print', function (done) {
    var opts = { debug: {} }
    opts.debug.argv = ['', '', '--seneca.log.print']
    var si = Seneca(opts)
    expect(si.export('options').log).includes({ level: 'print' })

    done()
  })
  it('--seneca.log.test', function (done) {
    var opts = { debug: {} }
    opts.debug.argv = ['', '', '--seneca.log.test']
    var si = Seneca(opts)
    expect(si.export('options').log).includes({ level: 'test' })

    done()
  })
  it('--seneca.log.standard', function (done) {
    var opts = { debug: {} }
    opts.debug.argv = ['', '', '--seneca.log.standard']
    var si = Seneca(opts)
    expect(si.export('options').log).includes({ level: 'standard' })

    done()
  })

  it('--seneca.log.level.quiet', function (done) {
    var opts = { debug: {} }
    opts.debug.argv = ['', '', '--seneca.log.level.quiet']
    var si = Seneca(opts)
    expect(si.export('options').log).includes({ level: 'quiet' })

    done()
  })
  it('--seneca.log.level.silent', function (done) {
    var opts = { debug: {} }
    opts.debug.argv = ['', '', '--seneca.log.level.silent']
    var si = Seneca(opts)
    expect(si.export('options').log).includes({ level: 'silent' })

    done()
  })
  it('--seneca.log.level.all', function (done) {
    var opts = { legacy: false, debug: {} }
    opts.debug.argv = ['', '', '--seneca.log.level.all']
    var si = Seneca(opts)
    expect(si.export('options').log).includes({ level: 'all' })

    done()
  })
  it('--seneca.log.level.any', function (done) {
    var opts = { legacy: false, debug: {} }
    opts.debug.argv = ['', '', '--seneca.log.level.any']
    var si = Seneca(opts)
    expect(si.export('options').log).includes({ level: 'any' })

    done()
  })
  it('--seneca.log.level.print', function (done) {
    var opts = { debug: {} }
    opts.debug.argv = ['', '', '--seneca.log.level.print']
    var si = Seneca(opts)
    expect(si.export('options').log).includes({ level: 'print' })

    done()
  })
  it('--seneca.log.level.test', function (done) {
    var opts = { debug: {} }
    opts.debug.argv = ['', '', '--seneca.log.level.test']
    var si = Seneca(opts)
    expect(si.export('options').log).includes({ level: 'test' })

    done()
  })
  it('--seneca.log.level.standard', function (done) {
    var opts = { debug: {} }
    opts.debug.argv = ['', '', '--seneca.log.level.standard']
    var si = Seneca(opts)
    expect(si.export('options').log).includes({ level: 'standard' })

    done()
  })
})
