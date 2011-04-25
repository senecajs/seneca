/* Copyright (c) 2010-2011 Ricebridge */

// NOTE: make these dependencies lazy?
var assert   = exports.assert  = require('assert')
var eyes     = exports.eyes    = require('eyes')
var util     = exports.util    = require('util')
var _        = exports._       = require('underscore')
var uuid     = exports.uuid    = require('node-uuid')
var gex      = exports.gex     = require('gex')
var crypto   = exports.crypto  = require('crypto')
var connect  = exports.connect = require('connect')
var oauth    = exports.oauth   = require('oauth')
var cookies  = exports.cookies = require('cookies')
var url      = exports.url     = require('url')


_.mixin({
  create:function(o){
    function F() {}
    F.prototype = o;
    return new F();
  }
});

