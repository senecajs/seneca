/* Copyright (c) 2010 Ricebridge */

var sys      = require('sys');
var assert   = require('assert');
var eyes     = require('eyes');
require('underscore');

function E( err ) {
  if( err ) {
    eyes.inspect(err);
    throw err;
  }
}

_.mixin({
  create:function(o){
    function F() {}
    F.prototype = o;
    return new F();
  }
});

exports.sys      = sys;
exports.eyes     = eyes;
exports.assert   = assert;

exports.E         = E;
