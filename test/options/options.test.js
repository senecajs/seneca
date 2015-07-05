/* Copyright (c) 2013-2015 Richard Rodger */
"use strict";


var assert = require('assert')

var seneca = require('../..')

var gex    = require('gex')
var Lab    = require('lab')


var lab      = exports.lab = Lab.script()
var describe = lab.describe
var it       = lab.it


describe('options', function(){


  it('options-happy', function(done){
    // loads ./seneca.options.js as well
    var si = seneca({d:4, foo:{dd:4}, log:'silent', module:module})

    var opts = si.options()
    assert.equal(1,opts.a)
    assert.equal(4,opts.d)
    assert.equal(1,opts.foo.aa)
    assert.equal(4,opts.foo.dd)

    var opts = si.export('options')
    assert.equal(1,opts.a)
    assert.equal(4,opts.d)
    assert.equal(1,opts.foo.aa)
    assert.equal(4,opts.foo.dd)
    done()
  })


  it('options-getset', function(done){
    var si = seneca({d:4, foo:{dd:4}, log:'silent', module:module})

    var a = si.options({e:5,foo:{ee:5}})
    //console.log('a',a)

    var opts = si.options()
    //console.log('b',opts)

    assert.equal(1,opts.a)
    assert.equal(4,opts.d)
    assert.equal(5,opts.e)
    assert.equal(1,opts.foo.aa)
    assert.equal(4,opts.foo.dd)
    assert.equal(5,opts.foo.ee)

    var opts = si.export('options')
    assert.equal(1,opts.a)
    assert.equal(4,opts.d)
    assert.equal(5,opts.e)
    assert.equal(1,opts.foo.aa)
    assert.equal(4,opts.foo.dd)
    assert.equal(5,opts.foo.ee)
    done()
  })


  it('options-legacy', function(done){
    var si = seneca({d:4, foo:{dd:4}, log:'silent', module:module})

    si.use('options',{e:5,foo:{ee:5}})

    var opts = si.options()
    assert.equal(1,opts.a)
    assert.equal(4,opts.d)
    assert.equal(5,opts.e)
    assert.equal(1,opts.foo.aa)
    assert.equal(4,opts.foo.dd)
    assert.equal(5,opts.foo.ee)

    var opts = si.export('options')
    assert.equal(1,opts.a)
    assert.equal(4,opts.d)
    assert.equal(5,opts.e)
    assert.equal(1,opts.foo.aa)
    assert.equal(4,opts.foo.dd)
    assert.equal(5,opts.foo.ee)
    done()
  })


  it('options-file-js', function(done){
    var si0 = seneca({d:4, foo:{dd:4}, log:'silent', module:module})

    si0.options('./options.require.js')

    var opts = si0.options()
    assert.equal(1,opts.a)
    assert.equal(4,opts.d)
    assert.equal(2,opts.b)
    assert.equal(1,opts.foo.aa)
    assert.equal(4,opts.foo.dd)
    assert.equal(2,opts.foo.bb)

    var opts = si0.export('options')
    assert.equal(1,opts.a)
    assert.equal(4,opts.d)
    assert.equal(2,opts.b)
    assert.equal(1,opts.foo.aa)
    assert.equal(4,opts.foo.dd)
    assert.equal(2,opts.foo.bb)
    done()
  })


  it('options-file-json', function(done){
    var si0 = seneca({d:4, foo:{dd:4}, log:'silent', module:module})

    si0.options(__dirname+'/options.file.json')

    var opts = si0.options()
    assert.equal(1,opts.a)
    assert.equal(4,opts.d)
    assert.equal(3,opts.c)
    assert.equal(1,opts.foo.aa)
    assert.equal(4,opts.foo.dd)
    assert.equal(3,opts.foo.cc)

    var opts = si0.export('options')
    assert.equal(1,opts.a)
    assert.equal(4,opts.d)
    assert.equal(3,opts.c)
    assert.equal(1,opts.foo.aa)
    assert.equal(4,opts.foo.dd)
    assert.equal(3,opts.foo.cc)
    done()
  })


  it('options-env', function(done){
    process.env.SENECA_LOG = "silent"
    process.env.SENECA_OPTIONS = '{"foo":"bar","a":99}'
    var si = seneca()
    var opts = si.options()

    assert.equal(0,opts.log.map.length)
    assert.equal('bar',opts.foo)
    assert.equal(99,opts.a)
    done()
  })


  it('options-cmdline', function(done){
    process.argv.push('--seneca.options.foo=bar')
    process.argv.push('--seneca.options.a=99')

    var si = seneca({log:'silent'})
    var opts = si.options()

    assert.equal('bar',opts.foo)
    assert.equal(99,opts.a)
    done()
  })


  it('options-internal',function(done){
    var si = seneca({log:'silent'})
    var ar = si.options().internal.actrouter
    assert.ok( null != ar )
    done()
  })


  it('options-invalid',function(done){
    try {
      seneca({idlen:'foo'})
      assert.fail()
    }
    catch(e){
      assert.equal('integer$',e.parambulator.code)
    }
    done()
  })

  // TODO: failure modes
})
