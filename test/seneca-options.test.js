/* Copyright (c) 2017 Richard Rodger, MIT License */
'use strict'

const { describe, it } = require('node:test')
const assert = require('node:assert/strict')

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
  it('--seneca.log=level:warn', function (t, done) {
    var opts = { debug: {} }
    opts.debug.argv = ['', '', '--seneca.log=level:warn']
    var si = Seneca(opts)

    assert.partialDeepStrictEqual(si.options().log, { level: 'warn' })

    done()
  })

  it('--seneca.log=level:warn+', function (t, done) {
    var opts = { debug: {} }
    opts.debug.argv = ['', '', '--seneca.log=level:warn+']
    var si = Seneca(opts)
    assert.partialDeepStrictEqual(si.export('options').log, { level: 'warn+' })

    done()
  })

  it('--seneca.log.level.warn', function (t, done) {
    var opts = { debug: {} }
    opts.debug.argv = ['', '', '--seneca.log.level.warn']
    var si = Seneca(opts)
    assert.partialDeepStrictEqual(si.export('options').log, { level: 'warn' })

    done()
  })

  it('--seneca.log.level.warn+', function (t, done) {
    var opts = { debug: {} }
    opts.debug.argv = ['', '', '--seneca.log.level.warn+']
    var si = Seneca(opts)
    assert.partialDeepStrictEqual(si.export('options').log, { level: 'warn+' })

    done()
  })

  it('duplicate param --seneca.log', function (t, done) {
    var opts = { debug: {} }
    opts.debug.argv = [
      '',
      '',
      '--seneca.log=level:warn',
      '--seneca.log=level:error',
    ]
    var si = Seneca(opts)
    assert.partialDeepStrictEqual(si.export('options').log, { level: 'warn' })

    done()
  })

  it('incorrect arg --seneca.log=level:', function (t, fin) {
    var opts = { debug: {} }
    opts.debug.argv = ['', '', '--seneca.log=level::']
    try {
      Seneca(opts)
      assert.fail()
    } catch (e) {
      assert.equal(e.code, 'bad_logspec_string')
      fin()
    }
  })

  it('incorrect arg --seneca.log.level.abc', function (t, done) {
    var opts = { debug: {} }
    opts.debug.argv = ['', '', '--seneca.log.level.abc']
    var si = Seneca(opts)
    assert.partialDeepStrictEqual(si.export('options').log, { level: 'abc' })

    done()
  })

  it('incorrect arg --seneca.log.abc', function (t, done) {
    var opts = { debug: {} }
    opts.debug.argv = ['', '', '--seneca.log.abc']
    var si = Seneca(opts)
    assert.partialDeepStrictEqual(si.export('options').log, { level: 'abc' })

    done()
  })
})

describe('seneca --seneca.log aliases tests: ', function () {
  it('--seneca.log.quiet', function (t, done) {
    var opts = { legacy: false, debug: {} }
    opts.debug.argv = ['', '', '--seneca.log.quiet']
    var si = Seneca(opts)
    assert.partialDeepStrictEqual(si.export('options').log, { level: 'quiet' })

    done()
  })
  it('--seneca.log.silent', function (t, done) {
    var opts = { legacy: false, debug: {} }
    opts.debug.argv = ['', '', '--seneca.log.silent']
    var si = Seneca(opts)
    assert.partialDeepStrictEqual(si.export('options').log, { level: 'silent' })

    done()
  })
  it('--seneca.log.all', function (t, done) {
    var opts = { legacy: false, debug: {} }
    opts.debug.argv = ['', '', '--seneca.log.all']
    var si = Seneca(opts)
    assert.partialDeepStrictEqual(si.export('options').log, { level: 'all' })

    done()
  })
  it('--seneca.log.any', function (t, done) {
    var opts = { legacy: false, debug: {} }
    opts.debug.argv = ['', '', '--seneca.log.any']
    var si = Seneca(opts)
    assert.partialDeepStrictEqual(si.export('options').log, { level: 'any' })

    done()
  })
  it('--seneca.log.print', function (t, done) {
    var opts = { legacy: false, debug: {} }
    opts.debug.argv = ['', '', '--seneca.log.print']
    var si = Seneca(opts)
    assert.partialDeepStrictEqual(si.export('options').log, { level: 'print' })

    done()
  })
  it('--seneca.log.test', function (t, done) {
    var opts = { legacy: false, debug: {} }
    opts.debug.argv = ['', '', '--seneca.log.test']
    var si = Seneca(opts)
    assert.partialDeepStrictEqual(si.export('options').log, { level: 'test' })

    done()
  })
  it('--seneca.log.standard', function (t, done) {
    var opts = { legacy: false, debug: {} }
    opts.debug.argv = ['', '', '--seneca.log.standard']
    var si = Seneca(opts)
    assert.partialDeepStrictEqual(si.export('options').log, {
      level: 'standard',
    })

    done()
  })

  it('--seneca.log.level.quiet', function (t, done) {
    var opts = { legacy: false, debug: {} }
    opts.debug.argv = ['', '', '--seneca.log.level.quiet']
    var si = Seneca(opts)
    assert.partialDeepStrictEqual(si.export('options').log, { level: 'quiet' })

    done()
  })
  it('--seneca.log.level.silent', function (t, done) {
    var opts = { legacy: false, debug: {} }
    opts.debug.argv = ['', '', '--seneca.log.level.silent']
    var si = Seneca(opts)
    assert.partialDeepStrictEqual(si.export('options').log, { level: 'silent' })

    done()
  })
  it('--seneca.log.level.all', function (t, done) {
    var opts = { legacy: false, debug: {} }
    opts.debug.argv = ['', '', '--seneca.log.level.all']
    var si = Seneca(opts)
    assert.partialDeepStrictEqual(si.export('options').log, { level: 'all' })

    done()
  })
  it('--seneca.log.level.any', function (t, done) {
    var opts = { legacy: false, debug: {} }
    opts.debug.argv = ['', '', '--seneca.log.level.any']
    var si = Seneca(opts)
    assert.partialDeepStrictEqual(si.export('options').log, { level: 'any' })

    done()
  })
  it('--seneca.log.level.print', function (t, done) {
    var opts = { legacy: false, debug: {} }
    opts.debug.argv = ['', '', '--seneca.log.level.print']
    var si = Seneca(opts)
    assert.partialDeepStrictEqual(si.export('options').log, { level: 'print' })

    done()
  })
  it('--seneca.log.level.test', function (t, done) {
    var opts = { legacy: false, debug: {} }
    opts.debug.argv = ['', '', '--seneca.log.level.test']
    var si = Seneca(opts)
    assert.partialDeepStrictEqual(si.export('options').log, { level: 'test' })

    done()
  })
  it('--seneca.log.level.standard', function (t, done) {
    var opts = { legacy: false, debug: {} }
    opts.debug.argv = ['', '', '--seneca.log.level.standard']
    var si = Seneca(opts)
    assert.partialDeepStrictEqual(si.export('options').log, {
      level: 'standard',
    })

    done()
  })
})
