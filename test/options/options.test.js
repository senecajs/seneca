/* Copyright (c) 2013-2014 Richard Rodger */
"use strict";

var seneca = require('../..')


var assert = require('chai').assert
var gex    = require('gex')



describe('options', function(){


  it('options-happy', function(){
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
  })


  it('options-getset', function(){
    var si = seneca({d:4, foo:{dd:4}, log:'silent', module:module})

    si.options({e:5,foo:{ee:5}})

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
  })


  it('options-legacy', function(){
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
  })


  it('options-file-js', function(){
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
  })


  it('options-file-json', function(){
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
  })


  it('options-env', function(){
    process.env.SENECA_LOG = "silent"
    process.env.SENECA_OPTIONS = '{"foo":"bar","a":99}'
    var si = seneca()
    var opts = si.options()

    assert.equal(0,opts.log.map.length)
    assert.equal('bar',opts.foo)
    assert.equal(99,opts.a)
  })


  it('options-cmdline', function(){
    process.argv.push('--seneca.options.foo=bar')
    process.argv.push('--seneca.options.a=99')

    var si = seneca({log:'silent'})
    var opts = si.options()

    assert.equal('bar',opts.foo)
    assert.equal(99,opts.a)
  })


  // TODO: failure modes
})

