/* Copyright (c) 2011 Ricebridge */

var common  = require('../../common');

var eyes    = common.eyes;
var util    = common.util;
var assert  = common.assert;
var _       = common._;
var uuid    = common.uuid;



function inserts(fields,text) {
  for( var f in fields ) {
    var uf = f.toUpperCase()
    var re = new RegExp('%'+uf+'%','g')
    text = text.replace(re,fields[f])
  }
  return text
}


function EmailPlugin() {
  var self = this;
  self.name = 'email'

  self.init = function(seneca,opts,cb){
    self.seneca = seneca
    self.opts   = opts

    var providerName = opts.type || 'postmark'
    var Provider = require('./'+providerName)
    
    var provider = new Provider(seneca,opts,cb)

    seneca.add({on:self.name,cmd:'send'},function(args,seneca,cb){

      var email = seneca.make$(args.tenant,'sys','email')
      email.load$({code:args.code},function(err,email){
        if( err ) return cb(err);

        var spec = provider.make(args)
        spec.id = common.uuid()
        seneca.log('plugin',self.name,'spec',spec)

        spec = self.prepare(spec,email)

        self.allow(spec,function(err,allow){
          if( err ) return cb(err);

          if( allow ) {
            provider.send(spec,function(err,res){
              if( err ) return cb(err);

              cb(null,{sent:true,res:res,spec:spec})
            })          
          }
          else {
            cb(null,{sent:false,why:'allow',spec:spec})
          }
        })
      })
    })
  }

  self.prepare = function(spec,email) {

    spec.subject = inserts(spec.fields,spec.subject||email.subject)
    spec.text    = inserts(spec.fields,spec.text||email.text)

    spec.from    = spec.from || email.from
    spec.to      = spec.to || email.to
    spec.replyto = spec.replyto || email.replyto

    return spec
  }

  self.allow = function( spec, cb ) {
    var user = seneca.make$(args.tenant,'sys','user')

    // emails can only be sent to users
    user.load$({email:spec.to},function(err,user){
      if( err ) return cb(err);

      cb(null,user&&!user.noemail)
    })
  }
}


exports.plugin = function() {
  return new EmailPlugin()
}

