/* Copyright (c) 2010-2011 Ricebridge */

var mongo  = require('mongodb');

var common  = require('../common');
var E = common.E;

var eyes    = common.eyes
var util    = common.util
var assert  = common.assert


var MIN_WAIT = 16
var MAX_WAIT = 65336


function makeid(hexstr) {
  if( mongo.BSONNative ) {
    return new mongo.BSONNative.ObjectID(hexstr)
  }
  else {
    return new mongo.BSONPure.ObjectID(hexstr)
  }
}

function MongoStore() {
  var self = this;
  self.name = 'mongo';
  self.waitmillis = MIN_WAIT

  self.dbinst = null;
  self.collmap = {};


  function error(err,cb) {
    if( err ) {
      util.debug('db error')
      //console.dir(err)
      util.debug(JSON.stringify(err))
      cb(err)

      if( 'ECONNREFUSED'==err.code || 'notConnected'==err.message ) {
        if( MIN_WAIT == self.waitmillis ) {
          self.collmap = {}
          reconnect()
        }
      }

      return true
    }

    return false
  }


  function reconnect() {
    util.debug('attempting db reconnect')
    self.configure(self.spec, function(err,me){
      if( err ) {
        util.debug('db reconnect (wait '+self.waitmillis+'ms) failed: '+err)
        self.waitmillis = Math.min(2*self.waitmillis,MAX_WAIT)
        setTimeout( reconnect, self.waitmillis )
      }
      else {
        self.waitmillis = MIN_WAIT
        util.debug('reconnect ok')
      }
    })
  }


  self.db = self._db = function() {
    return self.dbinst;
  }


  self.init = function(spec,cb) {
    var store = new MongoStore()
    self.configure(spec,cb)
  }


  self.configure = function(spec,cb) {
    self.spec = spec

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

    self.dbinst = new mongo.Db(
      conf.name,
      new mongo.Server(
        conf.server, 
        conf.port || mongo.Connection.DEFAULT_PORT, 
        {}
      ), 
      {native_parser:false,auto_reconnect:true}
    )
    
    self.dbinst.open(function(err){
      if( !error(err,cb) ) {
        self.waitmillis = MIN_WAIT

        if( conf.username ) {
          self.dbinst.authenticate(conf.username,conf.password,function(err){
            // do not attempt reconnect on auth error
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
    if(self.dbinst) {
      self.dbinst.close(cb);
    }
  }

  
  self.save = function(ent,cb) {
    var update = !!ent.id;

    getcoll(ent,function(err,coll){
      if( !error(err,cb) ) {
        var entp = {};

        ent.fields$(function(field){
          entp[field] = ent[field];
        });
        entp.t$ = ent.$.tenant$;
        delete entp.id;

        if( update ) {
          coll.update({_id:makeid(ent.id)},entp,{upsert:true},function(err,update){
            if( !error(err,cb) ) {
              cb(err,ent);
            }
          });
        }
        else {
          coll.insert(entp,function(err,inserts){
            if( !error(err,cb) ) {
              ent.id = inserts[0]._id.toHexString()
              cb(err,ent)
            }
          })
        }
      }
    })
  }


  self.load = function(qent,q,cb) {
    getcoll(qent,function(err,coll){
      if( !error(err,cb) ) {
        var mq = metaquery(qent,q)
        var qq = fixquery(qent,q)

        coll.findOne(qq,mq,function(err,entp){
          if( !error(err,cb) ) {
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
      if( !error(err,cb) ) {
        var mq = metaquery(qent,q)
        var qq = fixquery(qent,q)

        console.log(qq)

        coll.find(qq,mq,function(err,cur){
          if( !error(err,cb) ) {
            var list = []

            cur.each(function(err,entp){
              if( !error(err,cb) ) {
                if( entp ) {
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
      if( !error(err,cb) ) {
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
      qq._id = makeid(qq.id);
      delete qq.id;
    }
    qq.t$ = qent.$.tenant$;

    delete qq.tenant$
    delete qq.base$
    delete qq.name$
    delete qq.sort$
    delete qq.limit$

    return qq;
  }


  var metaquery = function(qent,q) {
    var mq = {}

    if( q.sort$ ) {
      for( var sf in q.sort$ ) break;
      var sd = q.sort$[sf] < 0 ? 'descending' : 'ascending'
      mq.sort = [[sf,sd]]
    }

    if( q.limit$ ) {
      mq.limit = q.limit$
    }

    return mq
  }


  var getcoll = function(ent,cb) {
    var collname = ent.$.base$+'_'+ent.$.name$;
    if( !self.collmap[collname] ) {
      self.dbinst.collection(collname, function(err,coll){
        if( !error(err,cb) ) {
          self.collmap[collname] = coll;
          cb(null,coll);
        }
      });
    }
    else {
      cb(null,self.collmap[collname]);
    }
  }
}

exports.store = function(spec) {
  return new MongoStore()
}

