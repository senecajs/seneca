/* Copyright (c) 2012 Richard Rodger */


var common   = require('../lib/common')
var router  = require('../lib/router')


var assert = common.assert
var Router = router.Router



module.exports = {

  basic: function() {
    var rt1 = new Router()
    
    rt1.add( {p1:'v1'}, 'r1' )
    assert.equal('r1',rt1.find({p1:'v1'}))
    assert.equal(null,rt1.find({p2:'v1'}))

    rt1.add( {p1:'v1'}, 'r1x' )
    assert.equal('r1x',rt1.find({p1:'v1'}))
    assert.equal(null,rt1.find({p2:'v1'}))

    rt1.add( {p1:'v2'}, 'r2' )
    assert.equal('r2',rt1.find({p1:'v2'}))
    assert.equal(null,rt1.find({p2:'v2'}))

    rt1.add( {p2:'v3'}, 'r3' )
    assert.equal('r3',rt1.find({p2:'v3'}))
    assert.equal(null,rt1.find({p2:'v2'}))
    assert.equal(null,rt1.find({p2:'v1'}))

    rt1.add( {p1:'v1',p3:'v4'}, 'r4' )
    assert.equal('r4',rt1.find({p1:'v1',p3:'v4'}))
    assert.equal('r1x',rt1.find({p1:'v1',p3:'v5'}))
    assert.equal(null,rt1.find({p2:'v1'}))
  },


  culdesac: function() {
    var rt1 = new Router()
    
    rt1.add( {p1:'v1'}, 'r1' )
    rt1.add( {p1:'v1',p2:'v2'}, 'r2' )
    rt1.add( {p1:'v1',p3:'v3'}, 'r3' )

    assert.equal('r1',rt1.find({p1:'v1',p2:'x'}))
    assert.equal('r3',rt1.find({p1:'v1',p2:'x',p3:'v3'}))
  }
  
}