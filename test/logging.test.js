/* Copyright (c) 2016 Richard Rodger, MIT License */
'use strict'

const Lab = require('@hapi/lab')
const Code = require('@hapi/code')

var lab = (exports.lab = Lab.script())
var describe = lab.describe
var expect = Code.expect

var Shared = require('./shared')
var it = Shared.make_it(lab)

var Seneca = require('..')
var Logging = require('../lib/logging')

describe('logging', function () {
  it('happy', function (fin) {
    var capture = make_log_capture()

    Seneca({ log: 'all', internal: { logger: capture } })
      .error(fin)
      .add('a:1', function (m, r) {
        r(null, { x: 1 })
      })
      .act('a:1', function () {
        expect(this.seneca).to.exist()
        this.log({ seen: 'a:1' })
      })
      .ready(function () {
        var log = capture.log.filter(function (entry) {
          return entry.seen
        })
        expect(log[0].seen).to.equal('a:1')
        fin()
      })
  })

  it('happy-ng', function (fin) {
    var capture = make_log_capture({ legacy: false })

    Seneca({ log: 'all', internal: { logger: capture } })
      .error(fin)
      .add('a:1', function (m, r) {
        r(null, { x: 1 })
      })
      .act('a:1', function () {
        expect(this.seneca).to.exist()
        this.log({ seen: 'a:1' })
      })
      .ready(function () {
        var log = capture.log.filter(function (entry) {
          return entry.seen
        })
        expect(log[0].seen).to.equal('a:1')
        fin()
      })
  })

  it('level-text-values', function (fin) {
    var capture = make_log_capture({ legacy: false })

    var options = Seneca().test(fin).options()

    // console.log('OPTS', options)

    // ensure text-level mapping is reversible
    Object.keys(options.log.text_level).forEach((text) => {
      expect(options.log.level_text[options.log.text_level[text]]).equal(text)
    })

    fin()
  })

  it('build_log_spec', function (fin) {
    var msi = (opts) => {
      return {
        options: () => {
          return opts
        },
      }
    }
    var out

    var logging = Logging()

    out = logging.build_log_spec(msi({ log: 'test' }))
    expect(out).contains({ level: 'warn', live_level: 400 })

    out = logging.build_log_spec(msi({ log: 'quiet' }))
    expect(out).contains({ level: 'none', live_level: 999 })

    out = logging.build_log_spec(msi({ log: 'any' }))
    expect(out).contains({ level: 'all', live_level: 100 })

    out = logging.build_log_spec(msi({ log: 'debug' }))
    expect(out).contains({ level: 'debug', live_level: 200 })

    out = logging.build_log_spec(msi({ log: 'fatal' }))
    expect(out).contains({ level: 'fatal', live_level: 600 })

    out = logging.build_log_spec(msi({ log: '300' }))
    expect(out).contains({ level: 'info', live_level: 300 })

    out = logging.build_log_spec(msi({ log: 300 }))
    expect(out).contains({ level: 'info', live_level: 300 })

    out = logging.build_log_spec(msi({ log: 301 }))
    expect(out).contains({ level: '301', live_level: 301 })

    fin()
  })

  it('event', function (fin) {
    var loga = []
    var logb = []
    Seneca({
      events: {
        log: function (data) {
          loga.push(data)
        },
      },
    })
      .test()
      .on('log', function (data) {
        logb.push(data)
      })
      .ready(function () {
        //console.log(loga)
        //console.log(logb)

        expect(loga.length).above(logb.length)
        var last_entry = logb[logb.length - 1]
        expect(last_entry).contains({
          kind: 'ready',
          case: 'call',
          name: 'ready_1',
        })

        var hello_entry = logb[logb.length - 2]
        expect(hello_entry.data).startsWith('hello')

        fin()
      })
  })

  it('quiet', function (fin) {
    Seneca().quiet().error(fin).ready(fin)
  })

  it('bad_logspec', function (fin) {
    try {
      Seneca({ log: true })
      Code.fail()
    } catch (e) {
      expect(e.code).equal('bad_logspec')
      fin()
    }
  })

  // DEPRECATED
  it('basic', function (fin) {
    var capture = make_log_capture()

    Seneca({ log: { basic: 'all' }, internal: { logger: capture } })
      .error(fin)
      .add('a:1', function (m, r) {
        r(null, { x: 1 })
      })
      .act('a:1', function () {
        expect(this.seneca).to.exist()
        this.log({ seen: 'a:1', level: 'info' })
      })
      .ready(function () {
        var log = capture.log.filter(function (entry) {
          return entry.seen
        })
        expect(log[0].seen).to.equal('a:1')
        fin()
      })
  })

  it('logger-output', function (fin) {
    var log

    var stdout_write = process.stdout.write
    // Note: comment out to see logs to debug test
    process.stdout.write = function (data) {
      log.push(data.toString())
    }

    function restore(err) {
      console.log('RESTORE', err)
      if (err && err.message && !err.message.includes('a1')) {
        console.log('FLAT LOGGER ERROR', err, log)
        process.stdout.write = stdout_write
        fin(err)
      } else if (true === err) {
        process.stdout.write = stdout_write
      }
    }

    // NOTE: call func directly to debug test
    // NOTE: tests: [flat, test] (hardcoded in `error`)
    basic('flat')

    function basic(logger) {
      log = []
      Seneca({
        log: { level: 'debug', logger: logger },
        legacy: { transport: false },
      })
        .error(restore)
        .add('a:1', a1)
        .act('a:1')
        .use(function foo() {
          this.add('b:1', function b1(m, r) {
            r({ x: 1 })
          })
        })
        .act('b:1')
        .ready(function () {
          expect(log.length).above(20)

          entry(logger)
        })
    }

    function entry(logger) {
      log = []
      Seneca({
        log: { level: 'debug', logger: logger },
        legacy: { transport: false },
      })
        .error(restore)
        .add('a:1', function a1(m, r) {
          this.log({
            maxlen$: 111,
            depth$: 4,
            a: { b: { c: { d: { e: { f: 1 } } } } },
          })
          this.log.debug(
            'foo',
            ['bar'],
            { zed: 1 },
            true,
            101,
            NaN,
            /re/,
            new Date(),
            null,
            void 0
          )
          this.log.info('eek!', m, r)
          this.log({
            isot: 1,
            when: 2,
            level_name: 3,
            seneca_id: 4,
            seneca_did: 5,
            plugin_name: 6,
            pugin_tag: 7,
            kind: 8,
            actid: 9,
            pattern: 10,
            action: 11,
            idpath: 12,
          })
          r({ x: 1 })
        })
        .act('a:1')
        .use(function foo$t0() {
          this.add('b:1', function b1(m, r) {
            r({ y: 1 })
          })
        })
        .act('b:1')
        .ready(function () {
          expect(log.length).above(20)

          error(logger)
        })
    }

    // TODO: why are there spurious lines to actual stdout?
    function error(logger) {
      log = []
      Seneca({
        log: { level: 'debug', logger: logger },
        legacy: { transport: false },
      })
        .error(restore)
        .add('a:1', function (m, r) {
          r(new Error('a1'))
        })
        .act('a:1')
        .ready(function () {
          expect(log.length).above(10)

          if ('flat' === logger) {
            basic('test')
          } else {
            restore(true)
            fin()
          }
        })
    }
  })

  it('shortcuts', function (fin) {
    var log

    var stdout_write = process.stdout.write
    // Note: comment out to see logs to debug test
    process.stdout.write = function (data) {
      log.push(data.toString())
    }

    function restore(err) {
      process.stdout.write = stdout_write

      if (err) {
        console.log('SHORTCUTS ERROR', log)
      }

      fin(err)
    }

    // NOTE: call shortcut directly to debug test
    nothing()

    function nothing() {
      log = []
      Seneca()
        .error(restore)
        .add('a:1', a1)
        .act('a:1')
        .ready(function () {
          // hello entry, legacy-transport ready entry
          // remove legacy-transport entry in 4.x

          //console.log('ZZZ', log)
          expect(log.length).to.equal(2)

          quiet()
        })
    }

    function quiet() {
      log = []
      Seneca({ log: 'quiet' })
        .error(restore)
        .add('a:1', a1)
        .act('a:1')
        .ready(function () {
          expect(log.length).to.equal(0)
          silent()
        })
    }

    function silent() {
      log = []
      Seneca({ log: 'silent' })
        .error(restore)
        .add('a:1', a1)
        .act('a:1')
        .ready(function () {
          expect(log.length).to.equal(0)
          any()
        })
    }

    function any() {
      log = []
      Seneca({ log: 'any' })
        .error(restore)
        .add('a:1', a1)
        .act('a:1')
        .ready(function () {
          expect(log.length).above(11)
          all()
        })
    }

    function all() {
      log = []
      Seneca({ log: 'all' })
        .error(restore)
        .add('a:1', a1)
        .act('a:1')
        .ready(function () {
          expect(log.length).above(11)
          print()
        })
    }

    function print() {
      log = []
      Seneca({ log: 'print' })
        .error(restore)
        .add('a:1', a1)
        .act('a:1')
        .ready(function () {
          expect(log.length).above(11)
          standard()
        })
    }

    function standard() {
      log = []
      Seneca({ log: 'standard' })
        .error(restore)
        .add('a:1', a1)
        .act('a:1')
        .ready(function () {
          // hello entry, legacy-transport ready entry
          // remove legacy-transport entry in 4.x
          expect(log.length).to.equal(2)

          json()
        })
    }

    // DEPRECATED DEFAULT = 4.x will change to 'flat'
    function json() {
      log = []
      Seneca()
        // Seneca( {log:'json'}) - change to this in 4.x
        .error(restore)
        .add('a:1', a1)
        .act('a:1')
        .ready(function () {
          expect(log.length).to.equal(2)

          flat()
        })
    }

    function flat() {
      log = []
      Seneca({ log: 'flat' }) // should not be needed in 4.x
        .error(restore)
        .add('a:1', a1)
        .act('a:1')
        .ready(function () {
          expect(log.length).to.equal(2)

          logger_test()
        })
    }

    function logger_test() {
      log = []
      Seneca({ logger: 'test' })
        .error(restore)
        .add('a:1', a1)
        .act('a:1')
        .ready(function () {
          expect(log.length).to.equal(2)

          do_test()
        })
    }

    function do_test() {
      log = []
      Seneca({ log: 'test' })
        .error(restore)
        .add('a:1', a1)
        .act('a:1')
        .ready(function () {
          expect(log.length).to.equal(0)
          restore()
        })
    }
  })

  function a1x(msg, reply) {
    // test mode log level is warn
    this.log.warn('a1x' + msg.x)
    reply()
  }

  function a1w(msg, reply) {
    this.log.warn('a1')
    reply()
  }

  it('test-mode-basic', function (fin) {
    var capture = make_log_capture()

    // Note: capture logger is marked from_options$ so overrides test_logger
    Seneca({ logger: capture })
      .test()
      .add('a:1', function a1(msg, reply) {
        this.log.warn('a1')
        reply()
      })
      .act('a:1')
      .ready(function () {
        // only warn should appear
        expect(capture.log.map((x) => x.data[0])).equal(['a1'])
        fin()
      })
  })

  it('test-mode-option', function (fin) {
    var capture = make_log_capture()

    // Note: capture logger is marked from_options$ so overrides test_logger
    Seneca({ logger: capture, test: true })
      .add('a:2', function a2(msg, reply) {
        // test mode log level is warn
        this.log.warn('a2')
        reply()
      })
      .act('a:2')
      .ready(function () {
        // only warn should appear
        expect(capture.log.map((x) => x.data[0])).equal(['a2'])
        fin()
      })
  })

  it('test-mode-argv', function (fin) {
    var capture = make_log_capture()
    Seneca({ logger: capture, debug: { argv: ['', '', '--seneca.test'] } })
      .add('a:1', a1w)
      .act('a:1')
      .ready(function () {
        expect(capture.log.map((x) => x.data[0])).equal(['a1'])
        fin()
      })
  })

  it('test-mode-argv-opts', function (fin) {
    var capture = make_log_capture()
    Seneca({
      logger: capture,
      debug: { argv: ['', '', '--seneca.options.test'] },
    })
      .add('a:1', a1w)
      .act('a:1')
      .ready(function () {
        //console.log(this.options().log)
        //console.log(capture.log)
        expect(capture.log.map((x) => x.data[0])).equal(['a1'])
        fin()
      })
  })

  it('test-mode-env', function (fin) {
    var capture = make_log_capture()
    Seneca({ logger: capture, debug: { env: { SENECA_TEST: 'test' } } })
      .add('a:1', a1w)
      .act('a:1')
      .ready(function () {
        expect(capture.log.map((x) => x.data[0])).equal(['a1'])
        fin()
      })
  })

  it('quiet-mode-basic', function (fin) {
    var capture = make_log_capture()

    // Note: capture logger is marked from_options$ so overrides test_logger
    Seneca({ logger: capture })
      .quiet()
      .add('a:1', a1w)
      .act('a:1')
      .ready(function () {
        expect(capture.log.length).equal(0)
        fin()
      })
  })

  it('quiet-mode-option', function (fin) {
    var capture = make_log_capture()

    // Note: capture logger is marked from_options$ so overrides test_logger
    Seneca({ logger: capture, quiet: true })
      .add('a:1', a1w)
      .act('a:1')
      .ready(function () {
        expect(capture.log.length).equal(0)
        fin()
      })
  })

  it('quiet-mode-argv', function (fin) {
    var capture = make_log_capture()
    Seneca({ logger: capture, debug: { argv: ['', '', '--seneca.quiet'] } })
      .add('a:1', a1w)
      .act('a:1')
      .ready(function () {
        expect(capture.log.length).equal(0)
        fin()
      })
  })

  it('quiet-mode-argv-opts', function (fin) {
    var capture = make_log_capture()
    Seneca({
      logger: capture,
      debug: { argv: ['', '', '--seneca.options.quiet'] },
    })
      .add('a:1', a1w)
      .act('a:1')
      .ready(function () {
        expect(capture.log.length).equal(0)
        fin()
      })
  })

  it('quiet-mode-env', function (fin) {
    var capture = make_log_capture()
    Seneca({ logger: capture, debug: { env: { SENECA_QUIET: 'true' } } })
      .add('a:1', a1w)
      .act('a:1')
      .ready(function () {
        expect(capture.log.length).equal(0)
        fin()
      })
  })

  it('test-quiet-mode-basic', function (fin) {
    var capture = make_log_capture()

    // Note: capture logger is marked from_options$ so overrides test_logger
    Seneca({ logger: capture })
      .test()
      .add('a:1', a1w)
      .act('a:1')
      .quiet()
      .act('a:1')
      .ready(function () {
        // NO LOGS - quiet called synchronously!
        expect(capture.log.length).equal(0)
        fin()
      })
  })

  it('quiet-test-mode-basic', function (fin) {
    var capture = make_log_capture()

    // Note: capture logger is marked from_options$ so overrides test_logger
    Seneca({ logger: capture })
      .quiet()
      .add('a:1', a1w)
      .act('a:1')
      .test()
      .act('a:1')
      .ready(function () {
        // BOTH LOGGED - test called synchronously!
        expect(capture.log.length).equal(2)
        fin()
      })
  })

  it('test-ready-quiet-mode-basic', function (fin) {
    var capture = make_log_capture()

    // Note: capture logger is marked from_options$ so overrides test_logger
    Seneca({ logger: capture })
      .test()
      .add('a:1', a1x)
      .act('a:1,x:1')
      .ready(function () {
        this.quiet().ready(function () {
          this.act('a:1,x:2')

          expect(capture.log.length).equal(1)
          expect(capture.log[0].data).equal(['a1x1'])
          fin()
        })
      })
  })

  it('quiet-ready-test-mode-basic', function (fin) {
    var capture = make_log_capture()

    // Note: capture logger is marked from_options$ so overrides test_logger
    Seneca({ logger: capture })
      .quiet()
      .add('a:1', a1x)
      .act('a:1,x:1')
      .ready(function () {
        this.test()

        this.act('a:1,x:2').ready(function () {
          expect(capture.log.length).equal(1)
          expect(capture.log[0].data).equal(['a1x2'])

          fin()
        })
      })
  })

  it('quiet-argv-override', function (fin) {
    var capture = make_log_capture()

    // Note: capture logger is marked from_options$ so overrides test_logger
    Seneca({ logger: capture, debug: { argv: ['', '', '--seneca.test'] } })
      .quiet()
      .add('a:1', a1x)
      .act('a:1,x:1')
      .ready(function () {
        expect(capture.log.length).equal(1)
        expect(capture.log[0].data).equal(['a1x1'])
        fin()
      })
  })

  it('test-argv-override', function (fin) {
    var capture = make_log_capture()

    // Note: capture logger is marked from_options$ so overrides test_logger
    Seneca({ logger: capture, debug: { argv: ['', '', '--seneca.quiet'] } })
      .test()
      .add('a:1', a1x)
      .act('a:1,x:1')
      .ready(function () {
        expect(capture.log.length).equal(0)
        fin()
      })
  })

  it('quiet-env-override', function (fin) {
    var capture = make_log_capture()

    // Note: capture logger is marked from_options$ so overrides test_logger
    Seneca({ logger: capture, debug: { env: { SENECA_TEST: 'true' } } })
      .quiet()
      .add('a:1', a1x)
      .act('a:1,x:1')
      .ready(function () {
        expect(capture.log.length).equal(1)
        expect(capture.log[0].data).equal(['a1x1'])
        fin()
      })
  })

  it('test-env-override', function (fin) {
    var capture = make_log_capture()

    // Note: capture logger is marked from_options$ so overrides test_logger
    Seneca({ logger: capture, debug: { env: { SENECA_QUIET: 'true' } } })
      .test()
      .add('a:1', a1x)
      .act('a:1,x:1')
      .ready(function () {
        expect(capture.log.length).equal(0)
        fin()
      })
  })

  it('intern.build_act_entry', function (fin) {
    var entry0 = {}
    var actA = { meta: { id: 1, pattern: 'p:1', tx: 3, mi: 4 }, def: { id: 2 } }

    Logging.intern.build_act_entry(actA, entry0)
    //console.log(entry0)

    expect(entry0).equal({
      kind: 'act',
      actid: 1,
      pattern: 'p:1',
      action: 2,
      idpath: '3.4',
    })

    var entry1 = {}
    actA.meta.parents = [
      null,
      [],
      [null, null],
      [null, 'foo'],
      [null, 'bar/zed'],
    ]
    Logging.intern.build_act_entry(actA, entry1)
    //console.log(entry1)

    expect(entry1).equal({
      kind: 'act',
      actid: 1,
      pattern: 'p:1',
      action: 2,
      idpath: '3.-.-.-.foo.bar.4',
    })

    fin()
  })

  // TODO: test --seneca.log arg and env - should override code
})

function a1(msg, reply) {
  reply(null, { x: 1 })
}

function make_log_capture(flags) {
  flags = flags || {}

  var capture = new Capture(flags)

  return capture
}

function Capture(flags) {
  var self = this
  self.id = Math.random()
  self.log = []

  self.preload = function () {
    var seneca = this
    var so = seneca.options()
    self.spec = so.log

    var legacy_logger = function (seneca, entry) {
      self.log.push(entry)
    }

    var nextgen_logger = function (entry) {
      self.log.push(entry)
    }

    var capture_logger = false === flags.legacy ? nextgen_logger : legacy_logger
    //console.log(capture_logger)

    capture_logger.id = self.id

    return {
      extend: {
        logger: capture_logger,
      },
    }
  }
}
