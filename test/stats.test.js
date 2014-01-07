/* Copyright (c) 2013 Richard Rodger, MIT License */
"use strict";


// mocha stats.test.js

var util   = require('util')

var stats   = require('../lib/stats')

var assert  = require('chai').assert



describe('stats', function(){

  it('wrap', function(){
    var ref = []
    for( var v = 1; v < 123; v++ ) {
      ref.push( Math.floor(100*Math.random()) );
      //ref.push(v)
    }
    ref['-2']=0
    ref['-1']=0
    //console.log(ref)

    var s = stats(3,11111), i = 0
    while( i < 120 ) {
      s.point(ref[i])
      var ts = ref[i-2]+ref[i-1]+ref[i]
      //console.log(ts)
      assert.equal(ts,s.calculate().sum);
      i++
    }
  })


  it('clock', function(){
    var cI = 0;
    function c() { return cI }

    var s = stats(11,2,c)
    s.point(1); 
    assert.equal(1,s.calculate().sum); cI++;
    assert.equal(1,s.calculate().sum); cI++;
    while( cI < 7 ) { 
      assert.equal(0,s.calculate().sum); cI++;
    }

    cI = 0
    var s = stats(3,2,c)
    s.point(1); 
    assert.equal(1,s.calculate().sum); cI++;
    assert.equal(1,s.calculate().sum); cI++;
    while( cI < 7 ) { 
      assert.equal(0,s.calculate().sum); cI++;
    }
  })


  it('wrapclock', function(){
    var cI = 0;
    function c() { return cI }

    var ref = []
    for( var v = 1; v < 123; v++ ) {
      ref.push( Math.floor(100*Math.random()) );
      //ref.push(v)
    }
    //ref['-3']=0
    ref['-2']=0
    ref['-1']=0
    //console.log(ref)

    var s = stats(4,3,c), i = 0
    while( i < 119 ) {
      s.point(ref[i]); 
      var ts = ref[i-2]+ref[i-1]+ref[i]
      //console.log(ts)
      assert.equal(ts,s.calculate().sum);
      i++
      cI++
    }
  })


  it('stats', function(){

    var s = stats(3,11111), o

    s.point(1); o = s.calculate()
    assert.equal(1,o.count);
    assert.equal(1,o.sum);
    assert.equal(1,o.mean);
    assert.equal(1,o.max);
    assert.equal(1,o.min);
    assert.equal(0,o.stddev);

    s.point(2); o = s.calculate()
    assert.equal(2,   o.count);
    assert.equal(3,   o.sum);
    assert.equal(1.5, o.mean);
    assert.equal(1,   o.min);
    assert.equal(2,   o.max);
    assert.equal(0.7071067811865476, o.stddev);

    s.point(3); o = s.calculate()
    assert.equal(3, o.count);
    assert.equal(6, o.sum);
    assert.equal(2, o.mean);
    assert.equal(1, o.min);
    assert.equal(3, o.max);
    assert.equal(1, o.stddev);

    s.point(4); o = s.calculate()
    assert.equal(3, o.count);
    assert.equal(9, o.sum);
    assert.equal(3, o.mean);
    assert.equal(2, o.min);
    assert.equal(4, o.max);
    assert.equal(1, o.stddev);


    s.point(6); o = s.calculate()
    assert.equal(3, o.count);
    assert.equal(13, o.sum);
    assert.equal(4.333333333333333, o.mean);
    assert.equal(3, o.min);
    assert.equal(6, o.max);
    assert.equal(1.5275252316519465, o.stddev);
  })

})
