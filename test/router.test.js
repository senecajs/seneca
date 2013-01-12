/* Copyright (c) 2012-2013 Richard Rodger */

"use strict";

var common = require('../lib/common')
var router = require('../lib/router')


var assert = require('chai').assert
var eyes   = common.eyes

var Router = router.Router


function rs(x) {
  return (''+x).replace(/\s+/g,'').replace(/\n+/g,'')
}

describe('router', function() {

  it('add', function() {
    var r

    r = new Router()
    r.add( {a:'1'}, 'r1' )
    //console.log(''+r)
    assert.equal(rs(r),"{k:'a',v:{'1':{d:'r1'}}}")

    r = new Router()
    r.add( {a:'1',b:'2'}, 'r1' )
    //console.log(''+r)
    assert.equal(rs(r),"{k:'a',v:{'1':{k:'b',v:{'2':{d:'r1'}}}}}")

    r = new Router()
    r.add( {a:'1',b:'2',c:'3'}, 'r1' )
    //console.log(''+r)
    assert.equal(rs(r),"{k:'a',v:{'1':{k:'b',v:{'2':{k:'c',v:{'3':{d:'r1'}}}}}}}")

    r = new Router()
    r.add( {a:'1',b:'2'}, 'r1' )
    r.add( {a:'1',b:'3'}, 'r2' )
    //console.log(''+r)
    assert.equal(rs(r),"{k:'a',v:{'1':{k:'b',v:{'2':{d:'r1'},'3':{d:'r2'}}}}}")

    r = new Router()
    r.add( {a:'1',b:'2'}, 'r1' )
    r.add( {a:'1',c:'3'}, 'r2' )
    //console.log(''+r)
    assert.equal(rs(r),"{k:'a',v:{'1':{k:'b',v:{'2':{d:'r1'},'':{k:'c',v:{'3':{d:'r2'}}}}}}}")

    r.add( {a:'1',d:'4'}, 'r3' )
    //console.log(''+r)
    assert.equal(rs(r),"{k:'a',v:{'1':{k:'b',v:{'2':{d:'r1'},'':{k:'c',v:{'3':{d:'r2'},'':{k:'d',v:{'4':{d:'r3'}}}}}}}}}")

    r = new Router()
    r.add( {a:'1',c:'2'}, 'r1' )
    r.add( {a:'1',b:'3'}, 'r2' )
    //console.log(''+r)
    assert.equal(rs(r),"{k:'a',v:{'1':{k:'b',v:{'3':{d:'r2'},'':{k:'c',v:{'2':{d:'r1'}}}}}}}")
  })


  it('basic', function() {
    var rt1 = new Router()
    
    rt1.add( {p1:'v1'}, 'r1' )
    //console.log(""+rt1)
    assert.equal('r1',rt1.find({p1:'v1'}))
    assert.equal(null,rt1.find({p2:'v1'}))

    rt1.add( {p1:'v1'}, 'r1x' )
    //console.log(""+rt1)
    assert.equal('r1x',rt1.find({p1:'v1'}))
    assert.equal(null,rt1.find({p2:'v1'}))

    rt1.add( {p1:'v2'}, 'r2' )
    //console.log(""+rt1)
    assert.equal('r2',rt1.find({p1:'v2'}))
    assert.equal(null,rt1.find({p2:'v2'}))

    rt1.add( {p2:'v3'}, 'r3' )
    //console.log(rt1)
    assert.equal('r3',rt1.find({p2:'v3'}))
    assert.equal(null,rt1.find({p2:'v2'}))
    assert.equal(null,rt1.find({p2:'v1'}))

    rt1.add( {p1:'v1',p3:'v4'}, 'r4' )
    //console.log(rt1)
    assert.equal('r4',rt1.find({p1:'v1',p3:'v4'}))
    assert.equal('r1x',rt1.find({p1:'v1',p3:'v5'}))
    assert.equal(null,rt1.find({p2:'v1'}))
  })


  it('culdesac', function() {
    var rt1 = new Router()
    
    rt1.add( {p1:'v1'}, 'r1' )
    rt1.add( {p1:'v1',p2:'v2'}, 'r2' )
    rt1.add( {p1:'v1',p3:'v3'}, 'r3' )
    //console.log(''+rt1)

    assert.equal('r1',rt1.find({p1:'v1',p2:'x'}))
    assert.equal('r3',rt1.find({p1:'v1',p2:'x',p3:'v3'}))
  }),


  it('findall', function() {
    var rt1 = new Router()
    
    rt1.add( {p1:'v1'}, 'r0' )

    rt1.add( {p1:'v1',p2:'v2a'}, 'r1' )
    rt1.add( {p1:'v1',p2:'v2b'}, 'r2' )

    //eyes.inspect(JSON.parse(''+rt1))

    var found = rt1.findall({p1:'v1'})
    //require('eyes').inspect(found)
    assert.equal('[{"match":{"p1":"v1"},"data":"r0"}]',JSON.stringify(found))


    found = rt1.findall({p1:'v1',p2:'*'})
    //require('eyes').inspect(found)
    assert.equal('[{"match":{"p1":"v1","p2":"v2a"},"data":"r1"},{"match":{"p1":"v1","p2":"v2b"},"data":"r2"}]',JSON.stringify(found))


    rt1.add( {p1:'v1',p2:'v2c',p3:'v3a'}, 'r3a' )
    rt1.add( {p1:'v1',p2:'v2d',p3:'v3b'}, 'r3b' )
    //require('eyes').inspect(JSON.parse(''+rt1))
    found = rt1.findall({p1:'v1',p2:'*',p3:'v3a'})
    //require('eyes').inspect(found)
    assert.equal('[{"match":{"p1":"v1","p2":"v2c","p3":"v3a"},"data":"r3a"}]',JSON.stringify(found))
  })

  
  it('remove', function(){
    var rt1 = new Router()
    rt1.remove( {p1:'v1'} )
    //console.log(''+rt1)

    rt1.add( {p1:'v1'}, 'r0' )
    //console.log(''+rt1)
    assert.equal('r0',rt1.find({p1:'v1'}))

    rt1.remove( {p1:'v1'} )
    //console.log(''+rt1)
    assert.equal(null,rt1.find({p1:'v1'}))

    rt1.add( {p2:'v2',p3:'v3'}, 'r1' )
    rt1.add( {p2:'v2',p4:'v4'}, 'r2' )
    //console.log(''+rt1)
    assert.equal('r1',rt1.find({p2:'v2',p3:'v3'}))
    assert.equal('r2',rt1.find({p2:'v2',p4:'v4'}))

    rt1.remove( {p2:'v2',p3:'v3'} )
    //console.log(''+rt1)
    assert.equal(null,rt1.find({p2:'v2',p3:'v3'}))
    assert.equal('r2',rt1.find({p2:'v2',p4:'v4'}))

  })
  
})