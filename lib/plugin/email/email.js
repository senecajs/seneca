/* Copyright (c) 2011 Ricebridge */

var common  = require('../../common');

var eyes    = common.eyes;
var util    = common.util;
var assert  = common.assert;
var _       = common._;
var uuid    = common.uuid;



function inserts(fields,text) {
  console.log('inserts on '+text+' '+JSON.stringify(fields))
  if( fields ) {
    for( var f in fields ) {
      var uf = f.toUpperCase()
      var re = new RegExp('%'+uf+'%','g')
      text = text.replace(re,fields[f])
    }
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
    
    var provider = new Provider(seneca,opts)

    console.log('EMAIL ADD CMD')

    seneca.add({on:self.name,cmd:'send'},function(args,seneca,cb){

      var email = seneca.make$(args.tenant,'sys','email')
      email.load$({code:args.code},function(err,email){
        console.log('email load '+args.code+' '+email)
        if( err ) return cb(err);

        var spec = provider.make(args)
        spec.id = common.uuid()
        seneca.log('plugin',self.name,'spec',spec)

        spec = self.prepare(spec,args,email)

        self.allow(args,spec,function(err,allow){
         console.log('EMAIL allow '+allow+' '+err)
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

    cb()
  }

  self.prepare = function(spec,args,email) {

    spec.subject = inserts(args.fields,spec.subject||email.subject)
    spec.text    = inserts(args.fields,spec.text||email.text)
    spec.to      = spec.to || email.to

    spec.from    = spec.from || email.from
    spec.replyto = spec.replyto || email.replyto

    return spec
  }

  self.allow = function( args, spec, cb ) {
    var user = self.seneca.make$(args.tenant,'sys','user')

    // emails can only be sent to users
    user.load$({email:spec.to},function(err,user){
      console.log('EMAIL err '+err)
      if( err ) return cb(err);

      console.log('EMAIL '+spec.to+' user:'+user)

      cb(null,user&&!user.noemail)
    })
  }
}


exports.plugin = function() {
  return new EmailPlugin()
}

