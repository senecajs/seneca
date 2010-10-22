/* Copyright (c) 2010 Ricebridge */

var sys      = require('sys');
var assert   = require('assert');
var eyes     = require('eyes');

function E( err ) {
  if( err ) {
    eyes.inspect(err);
    throw err;
  }
}



exports.sys      = sys;
exports.eyes     = eyes;
exports.assert   = assert;

exports.E         = E;
