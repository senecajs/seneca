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


describe('logging', function() {
  it('happy', function(fin) {
    var capture = make_log_capture()

    Seneca({ log: 'all', internal: { logger: capture } })
      .error(fin)
      .add('a:1', function(m, r) {
        r(null, { x: 1 })
      })
      .act('a:1', function() {
        expect(this.seneca).to.exist()
        this.log({ seen: 'a:1' })
      })
      .ready(function() {
        var log = capture.log.filter(function(entry) {
          return entry.seen
        })
        expect(log[0].seen).to.equal('a:1')
        fin()
      })
  })

  it('happy-ng', function(fin) {
    var capture = make_log_capture({legacy:false})

    Seneca({ log: 'all', internal: { logger: capture } })
      .error(fin)
      .add('a:1', function(m, r) {
        r(null, { x: 1 })
      })
      .act('a:1', function() {
        expect(this.seneca).to.exist()
        this.log({ seen: 'a:1' })
      })
      .ready(function() {
        var log = capture.log.filter(function(entry) {
          return entry.seen
        })
        expect(log[0].seen).to.equal('a:1')
        fin()
      })
  })

  it('level-text-values', function(fin) {
    var capture = make_log_capture({legacy:false})

    var options = Seneca()
        .test(fin)
        .options()

    // console.log('OPTS', options)
    
    // ensure text-level mapping is reversible
    Object.keys(options.log.text_level).forEach(text=>{
      expect(options.log.level_text[options.log.text_level[text]]).equal(text)
    })
    
    fin()
  })


  it('build_log_spec', function(fin) {
    var msi = (opts)=>{return {options:()=>{return opts}}}
    var out

    var logging = Logging()
    
    out = logging.build_log_spec(msi({log:'test'}))
    expect(out).contains({level:'warn', live_level:400})

    out = logging.build_log_spec(msi({log:'quiet'}))
    expect(out).contains({level:'none', live_level:999})

    out = logging.build_log_spec(msi({log:'any'}))
    expect(out).contains({level:'all', live_level:100})

    out = logging.build_log_spec(msi({log:'debug'}))
    expect(out).contains({level:'debug', live_level:200})

    out = logging.build_log_spec(msi({log:'fatal'}))
    expect(out).contains({level:'fatal', live_level:600})


    out = logging.build_log_spec(msi({log:'300'}))
    expect(out).contains({level:'info', live_level:300})

    out = logging.build_log_spec(msi({log:300}))
    expect(out).contains({level:'info', live_level:300})

    out = logging.build_log_spec(msi({log:301}))
    expect(out).contains({level:'301', live_level:301})

    fin()
  })


  it('event', function(fin) {
    var loga = []
    var logb = []
    Seneca({
      events: {
        log: function(data) {
          loga.push(data)
        }
      }
    })
      .test()
      .on('log', function(data) {
        logb.push(data)
      })
      .ready(function() {
        //console.log(loga)
        //console.log(logb)

        expect(loga.length).above(logb.length)
        var last_entry = logb[logb.length - 1]
        expect(last_entry).contains({
          kind: 'ready',
          case: 'call',
          name: 'ready_1'
        })

        var hello_entry = logb[logb.length - 2]
        expect(hello_entry.data).startsWith('hello')

        fin()
      })
  })


  it('quiet', function(fin) {
    Seneca()
      .quiet()
      .error(fin)
      .ready(fin)
  })

  
  // DEPRECATED
  it('basic', function(fin) {
    var capture = make_log_capture()

    Seneca({ log: { basic: 'all' }, internal: { logger: capture } })
      .error(fin)
      .add('a:1', function(m, r) {
        r(null, { x: 1 })
      })
      .act('a:1', function() {
        expect(this.seneca).to.exist()
        this.log({ seen: 'a:1', level:'info' })
      })
      .ready(function() {
        var log = capture.log.filter(function(entry) {
          return entry.seen
        })
        expect(log[0].seen).to.equal('a:1')
        fin()
      })
  })


  it('shortcuts', function(fin) {
    var log
    var stdout_write = process.stdout.write
    process.stdout.write = function(data) {
      log.push(data.toString())
    }

    function restore(err) {
      process.stdout.write = stdout_write

      if(err) {
        console.log('ERROR', log)
      }
      
      fin(err)
    }

    nothing()

    function nothing() {
      log = []
      Seneca()
        .error(restore)
        .add('a:1', a1)
        .act('a:1')
        .ready(function() {
          // hello entry, legacy-transport ready entry
          // remove legacy-transport entry in 4.x
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
        .ready(function() {
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
        .ready(function() {
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
        .ready(function() {
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
        .ready(function() {
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
        .ready(function() {
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
        .ready(function() {
          // hello entry, legacy-transport ready entry
          // remove legacy-transport entry in 4.x
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
        .ready(function() {
          expect(log.length).to.equal(0)
          restore()
        })
    }
  })


  it('test-mode-basic', function(fin) {
    var capture = make_log_capture()

    // Note: capture logger is marked from_options$ so overrides test_logger
    Seneca({logger:capture})
      .test()
      .add('a:1', function a1(msg, reply) {
        // test mode log level is warn
        this.log.warn('a1')
        reply()
      })
      .act('a:1')
      .ready(function() {
        // only warn should appear
        expect(capture.log.map(x=>x.data[0])).equal(['a1'])
        fin()
      })
  })


  it('test-mode-option', function(fin) {
    var capture = make_log_capture()

    // Note: capture logger is marked from_options$ so overrides test_logger
    Seneca({logger:capture, test:true})
      .add('a:2', function a2(msg, reply) {
        // test mode log level is warn
        this.log.warn('a2')
        reply()
      })
      .act('a:2')
      .ready(function() {
        // only warn should appear
        expect(capture.log.map(x=>x.data[0])).equal(['a2'])
        fin()
      })
  })






  /* FIX
  it('test-mode-argv', function(fin) {
    var capture = make_log_capture()
    Seneca({logger:capture, debug:{argv:['--seneca.test']}})
      .add('a:1', function a1(msg, reply) {
        this.log.warn('a1')
        reply()
      })
      .act('a:1')
      .ready(function() {
        console.log(capture.log)
        expect(capture.log.map(x=>x.data[0])).equal(['a1'])
        fin()
      })
  })
  */
  
  /*
  it('test-mode-env', function(fin) {
    var capture = make_log_capture()
    Seneca({logger:capture, debug:{env:{SENECA_TEST:'true'}}})
      .add('a:1', function a1(msg, reply) {
        this.log.warn('a1')
        reply()
      })
      .act('a:1')
      .ready(function() {
        console.log(capture.log)
        expect(capture.log.map(x=>x.data[0])).equal(['a1'])
        fin()
      })
  })
  */
  
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
  
  self.preload = function() {
    var seneca = this
    var so = seneca.options()
    self.spec = so.log
    
    var legacy_logger = function(seneca, entry) {
      self.log.push(entry)
    }
    
    var nextgen_logger = function(entry) {
      self.log.push(entry)
    }
    
    var capture_logger = false === flags.legacy ? nextgen_logger : legacy_logger
    //console.log(capture_logger)

    capture_logger.id = self.id
    
    return {
      extend: {
        logger: capture_logger
      }
    }
  }
}
