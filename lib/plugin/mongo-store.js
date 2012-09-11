/* Copyright (c) 2010-2012 Richard Rodger */


var mongo  = require('mongodb')

var common  = require('../common')
var store   = require('./store')


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
  var self   = new store.Store()
  var parent = self.parent()

  var mark = common.idgen(4)


  self.name = 'mongo'


  // TODO: make private?
  self.waitmillis = MIN_WAIT
  self.dbinst     = null
  self.collmap    = {}


  function error(args,err,cb) {
    if( err ) {
      seneca.log(args.tag$,'error: '+err)
      seneca.fail({code:'entity/error',store:self.name},cb)

      if( 'ECONNREFUSED'==err.code || 'notConnected'==err.message ) {
        if( MIN_WAIT == self.waitmillis ) {
          self.collmap = {}
          reconnect(args)
        }
      }

      return true
    }

    return false
  }


  function reconnect(args) {
    seneca.log(args.tag$,'attempting db reconnect')

    self.configure(self.spec, function(err,me){
      if( err ) {
        seneca.log(args.tag$,'db reconnect (wait '+self.waitmillis+'ms) failed: '+err)
        self.waitmillis = Math.min(2*self.waitmillis,MAX_WAIT)
        setTimeout( function(){reconnect(args)}, self.waitmillis )
      }
      else {
        self.waitmillis = MIN_WAIT
        seneca.log(args.tag$,'reconnect ok')
      }
    })
  }


  self.db = function() {
    return self.dbinst;
  }


  self.init = function(si,opts,cb) {
    parent.init(si,opts,function(err,canondesc){
      if( err ) return cb(err);
      mark = canondesc+'~'+mark

      // TODO: parambulator check on opts

      seneca = si

      self.configure(opts,function(err){
        if( err ) {
          return seneca.fail({code:'entity',store:self.name,error:err},cb)
        } 
        else cb();
      })
    })
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

    if( conf.replicaset ) {
      var rservs = []
      for( var i = 0; i < conf.replicaset.servers.length; i++ ) {
	var servconf = conf.replicaset.servers[i]
	rservs.push(new mongo.Server(servconf.host,servconf.port,{native_parser:false,auto_reconnect:true}))
      }
      var rset = new mongo.ReplSetServers(rservs)
      self.dbinst = new mongo.Db(
	conf.name, rset
      )
    }
    else {
      self.dbinst = new mongo.Db(
        conf.name,
        new mongo.Server(
          conf.host || conf.server, 
          conf.port || mongo.Connection.DEFAULT_PORT, 
          {}
        ), 
        {native_parser:false,auto_reconnect:true}
      )
    }

    self.dbinst.open(function(err){
      if( !error({tag$:'init'},err,cb) ) {
        self.waitmillis = MIN_WAIT

        if( conf.username ) {
          self.dbinst.authenticate(conf.username,conf.password,function(err){
            // do not attempt reconnect on auth error
            if( err) {
              cb(err)
            }
            else {
              seneca.log({tag$:'init'},'db open and authed for '+conf.username)
              cb(null,self)
            }
          })
        }
        else {
          seneca.log({tag$:'init'},'db open')
          cb(null,self)
        }
      }
    });
  }


  self.close$ = function(cb) {
    if(self.dbinst) {
      self.dbinst.close(cb)
    }
  }

  
  self.save$ = function(args,cb) {
    var ent = args.ent    

    var update = !!ent.id;

    getcoll(args,ent,function(err,coll){
      if( !error(args,err,cb) ) {
        var entp = {};

        var fields = ent.fields$()
        fields.forEach( function(field) {
          entp[field] = ent[field]
        })

        if( update ) {
          coll.update({_id:makeid(ent.id)},entp,{upsert:true},function(err,update){
            if( !error(args,err,cb) ) {
              seneca.log(args.tag$,'save/update',ent,mark)
              cb(null,ent)
            }
          })
        }
        else {
          coll.insert(entp,function(err,inserts){
            if( !error(args,err,cb) ) {
              ent.id = inserts[0]._id.toHexString()

              seneca.log(args.tag$,'save/insert',ent,mark)
              cb(null,ent)
            }
          })
        }
      }
    })
  }


  self.load$ = function(args,cb) {
    var qent = args.qent
    var q    = args.q

    getcoll(args,qent,function(err,coll){
      if( !error(args,err,cb) ) {
        var mq = metaquery(qent,q)
        var qq = fixquery(qent,q)

        coll.findOne(qq,mq,function(err,entp){
          if( !error(args,err,cb) ) {
            var fent = null;
            if( entp ) {
              entp.id = entp._id.toHexString();
              delete entp._id;

              fent = qent.make$(entp);
            }

            seneca.log(args.tag$,'load',fent,mark)
            cb(null,fent);
          }
        });
      }
    })
  }


  self.list$ = function(args,cb) {
    var qent = args.qent
    var q    = args.q

    getcoll(args,qent,function(err,coll){
      if( !error(args,err,cb) ) {
        var mq = metaquery(qent,q)
        var qq = fixquery(qent,q)

        coll.find(qq,mq,function(err,cur){
          if( !error(args,err,cb) ) {
            var list = []

            cur.each(function(err,entp){
              if( !error(args,err,cb) ) {
                if( entp ) {
                  var fent = null;
                  if( entp ) {
                    entp.id = entp._id.toHexString();
                    delete entp._id;

                    fent = qent.make$(entp);
                  }
                  list.push(fent)
                }
                else {
                  seneca.log(args.tag$,'list',list.length,list[0],mark)
                  cb(null,list)
                }
              }
            })
          }
        })
      }
    })
  }


  self.remove$ = function(args,cb) {
    var qent = args.qent
    var q    = args.q

    getcoll(args,qent,function(err,coll){
      if( !error(args,err,cb) ) {
        var qq = fixquery(qent,q)        

        if( q.all$ ) {
          coll.remove(qq,function(err){
            cb(err)
          })
        }
        else {
          var mq = metaquery(qent,q)
          coll.findOne(qq,mq,function(err,entp){
            if( !error(args,err,cb) ) {
              if( entp ) {
                coll.remove({_id:entp._id},function(err){
                  cb(err)
                })
              }
              else cb(null)
            }
          })
        }
      }
    })
  }


  var fixquery = function(qent,q) {
    var qq = {};
    for( var qp in q ) {
      if( !qp.match(/\$$/) ) {
        qq[qp] = q[qp]
      }
    }
    if( qq.id ) {
      qq._id = makeid(qq.id)
      delete qq.id
    }

    return qq
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


  var getcoll = function(args,ent,cb) {
    var canon = ent.canon$({object:true})

    var collname = (canon.base?canon.base+'_':'')+canon.name

    if( !self.collmap[collname] ) {
      self.dbinst.collection(collname, function(err,coll){
        if( !error(args,err,cb) ) {
          self.collmap[collname] = coll
          cb(null,coll);
        }
      });
    }
    else {
      cb(null,self.collmap[collname])
    }
  }

  return self
}

exports.plugin = function() {
  return new MongoStore()
}

