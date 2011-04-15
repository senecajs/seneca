/* Copyright (c) 2010-2011 Ricebridge */

var mongo  = require('mongodb');

var common  = require('../common');
var E = common.E;

var eyes    = common.eyes
var util    = common.util
var assert  = common.assert



function MongoStore() {
  var self = this;
  self.name = 'mongo';

  var db = null;
  var collmap = {};

  self.init = function(spec,cb) {
    var store = new MongoStore()
    self.configure(spec,cb)
  }


  self.configure = function(spec,cb) {
    var conf = 'string' == typeof(spec) ? null : spec

    if( !conf ) {
      conf = {}
      var urlM = /^mongo:\/\/((.*?):(.*?)@)?(.*?)(:?(\d+))?\/(.*?)$/.exec(spec);
      conf.name   = urlM[7]
      conf.port   = urlM[6]
      conf.server = urlM[4]
      conf.username = urlM[2]
      conf.password = urlM[3]

      conf.port = conf.port ? parseInt(conf.port,10) : null
    }

    db = new mongo.Db(
      conf.name,
      new mongo.Server(
        conf.server, 
        conf.port || mongo.Connection.DEFAULT_PORT, 
        {}
      ), 
      {native_parser:true,auto_reconnect:true}
    )
    
    db.open(function(err){
      if(err) {
        cb(err)
      }
      else {
        if( conf.username ) {
          db.authenticate(conf.username,conf.password,function(err){
            if( err) {
              cb(err)
            }
            else {
              cb(null,self)
            }
          })
        }
        else {
          cb(null,self)
        }
      }
    });
  }


  self.close = function(cb) {
    if(db) {
      db.close(cb);
    }
  }

  
  self.save = function(ent,cb) {
    var update = !!ent.id;
    
    getcoll(ent,function(err,coll){
      if(err){cb(err,null)}
      else {
        var entp = {};

        ent.fields$(function(field){
          entp[field] = ent[field];
        });
        entp.t$ = ent.$.tenant$;
        delete entp.id;

        if( update ) {
          coll.update({_id:new mongo.BSONNative.ObjectID(ent.id)},entp,{upsert:true},function(err,update){
            cb(err,ent);
          });

        }
        else {
          coll.insert(entp,function(err,inserts){
            ent.id = inserts[0]._id.toHexString();
            cb(err,ent);
          });
        }
      }
    });
  }


  self.load = function(qent,q,cb) {
    getcoll(qent,function(err,coll){
      if(err){cb(err,null)}
      else {
        var qq = fixquery(qent,q);

        coll.findOne(qq,function(err,entp){
          if(err){cb(err,null)}
          else {
            var fent = null;
            if( entp ) {
              entp.id = entp._id.toHexString();
              delete entp._id;

              entp.tenant$ = entp.t$;
              delete entp.t$;

              fent = qent.make$(entp);
            }
            cb(null,fent);
          }
        });
      }
    });
  }


  self.list = function(qent,q,cb) {
    getcoll(qent,function(err,coll){
      if(err){cb(err,null)}
      else {
        var qq = fixquery(qent,q);
        eyes.inspect(qq,'mongo q');

        coll.find(qq,function(err,cur){
          if(err){cb(err,null)}
          else {
            var list = []
            cur.each(function(err,ent){
              if(err){cb(err,null)}
              else {
                if( ent ) {
                  var fent = null;
                  if( entp ) {
                    entp.id = entp._id.toHexString();
                    delete entp._id;

                    entp.tenant$ = entp.t$;
                    delete entp.t$;

                    fent = qent.make$(entp);
                  }
                  list.push(fent)
                }
                else {
                  cb(null,list)
                }
              }
            })
          }
        })
      }
    })
  }


  self.remove = function(qent,q,cb) {
    getcoll(qent,function(err,coll){
      if(err){cb(err,null)}
      else {
        var qq = fixquery(qent,q);
        
        coll.remove(qq,function(err){
          cb(err);
        });
      }
    });
  }


  var fixquery = function(qent,q) {
    var qq = {};
    for( var qp in q ) {
      qq[qp] = q[qp];
    }
    if( qq.id ) {
      qq._id = new mongo.BSONNative.ObjectID(qq.id);
      delete qq.id;
    }
    qq.t$ = qent.$.tenant$;

    delete qq.tenant$
    delete qq.base$
    delete qq.name$

    return qq;
  }


  var getcoll = function(ent,cb) {
    var collname = ent.$.base$+'_'+ent.$.name$;
    if( !collmap[collname] ) {
      db.collection(collname, function(err,coll){
        collmap[collname] = coll;
        cb(err,coll);
      });
    }
    else {
      cb(null,collmap[collname]);
    }
  }
}

exports.store = function(spec) {
  return new MongoStore()
}

