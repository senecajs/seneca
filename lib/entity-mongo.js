/* Copyright (c) 2010 Ricebridge */

var mongo  = require('mongodb');

var entity  = require('./entity');
var Entity = entity.Entity;

var common  = require('./common');
var E = common.E;

var eyes    = common.eyes
var util    = common.util
var assert  = common.assert



function MongoStore() {
  var self = this;
  self.name = 'mongo';

  var db = null;
  var collmap = {};

  self.init = function(spec,win,fail) {
    var conf = 'string' == typeof(spec) ? null : spec

    if( !conf ) {
      conf = {}
      var urlM = /^mongo:\/\/(.*?)\/(.*?)$/.exec(spec);
      conf.name   = urlM[2]
      conf.server = urlM[1]
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
      E(err);

      if( conf.username ) {
        db.authenticate(conf.username,conf.password,function(err){
          if( err) {
            fail && fail(err)
          }
          else {
            win && win()
          }
        })
      }
      else {
        win && win();
      }
    });
  }


  self.close = function(cb) {
    util.debug('entity-mongo close: '+db)
    if(db) {
      db.close(cb);
    }
  }

  
  self.save = function(ent,cb) {
    var update = !!ent.id;
    
    getcoll(ent,function(err,coll){
      E(err);
      var entp = {};

      ent.fields$(function(field){
        entp[field] = ent[field];
      });
      entp.t$ = ent.$.tenant$;
      delete entp.id;

      util.debug('u:'+update+' '+ent);
      eyes.inspect(entp,'entp');
      
      if( update ) {
        coll.update({_id:new mongo.BSONNative.ObjectID(ent.id)},entp,{upsert:true},function(err,update){
          util.debug('update,err:'+err);
          cb(err,ent);
        });

      }
      else {
        coll.insert(entp,function(err,inserts){
          util.debug('insert,err:'+err);
          ent.id = inserts[0]._id.toHexString();
          cb(err,ent);
        });
      }
    });

  }



  self.find = function(qent,q,cb) {
    getcoll(qent,function(err,coll){
      if(err){cb(err,null)}
      else {
        var qq = fixquery(qent,q);
        eyes.inspect(qq,'mongo q');

        coll.findOne(qq,function(err,entp){
          util.debug(err);
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
      util.debug('qq._id='+qq._id.toHexString())
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

Entity.register$( new MongoStore() );

