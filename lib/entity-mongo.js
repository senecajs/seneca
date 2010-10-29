/* Copyright (c) 2010 Ricebridge */

var mongo  = require('mongodb');

var entity  = require('./entity');
var Entity = entity.Entity;

var common  = require('./common');
var E = common.E;

var sys     = common.sys;
var eyes    = common.eyes;
var assert  = common.assert;


function MongoStore() {
  var self = this;
  self.name = 'mongo';

  var db = null;
  var collmap = {};

  self.init = function(url,cb) {
    var urlM = /^mongo:\/\/(.*?)\/(.*?)$/.exec(url);
    db = new mongo.Db(urlM[2], new mongo.Server(urlM[1], mongo.Connection.DEFAULT_PORT, {}), {native_parser:true,auto_reconnect:true});
    
    db.open(function(err){
      E(err);
      cb();
    });
  }


  self.close = function(cb) {
    if(db) {
      db.close();
    }
  }

  
  self.save = function(ent,cb) {
    var update = !!ent.id;
    
    getcoll(ent,function(err,coll){
      E(err);
      var entp = {};

      ent.$fields(function(field){
        entp[field] = ent[field];
      });
      entp.t$ = ent.$.$tenant;
      delete entp.id;

      sys.puts('u:'+update+' '+ent);
      eyes.inspect(entp,'entp');
      
      if( update ) {
        coll.update({_id:new mongo.ObjectID(ent.id)},entp,{upsert:true},function(err,update){
          sys.puts('update,err:'+err);
          cb(err,ent);
        });

      }
      else {
        coll.insert(entp,function(err,inserts){
          sys.puts('insert,err:'+err);
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
          sys.puts(err);
          if(err){cb(err,null)}
          else {
            var fent = null;
            if( entp ) {
              entp.id = entp._id.toHexString();
              delete entp._id;

              entp.$tenant = entp.t$;
              delete entp.t$;

              fent = qent.$make(entp);
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
      qq._id = new mongo.ObjectID(qq.id);
      delete qq.id;
    }
    qq.t$ = qent.$.$tenant;
    return qq;
  }

  var getcoll = function(ent,cb) {
    var collname = ent.$.$base+'_'+ent.$.$name;
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

Entity.$register( new MongoStore() );

