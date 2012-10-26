/* Copyright (c) 2010-2012 Richard Rodger */

var pg      = require('pg')

var common  = require('../common');
var store   = require('./store');

var eyes    = common.eyes;
var _       = common._;
var uuid    = common.uuid;


var MIN_WAIT = 16
var MAX_WAIT = 65336


function PostgresStore() {
  var self   = new store.Store()
  var parent = self.parent()
  
  self.name = 'postgres-store'

  var mark = common.idgen(4)

  self.waitmillis = MIN_WAIT
  self.dbinst     = null


  function error(args,err,cb) {
    if( err ) {
      seneca.log(args.tag$,'error: '+err)
      seneca.fail({code:'entity/error',store:self.name},cb)

      if( 'ECONNREFUSED'==err.code || 'notConnected'==err.message ) {
        if( MIN_WAIT == self.waitmillis ) {
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

      var urlM = /^postgres:\/\/((.*?):(.*?)@)?(.*?)(:?(\d+))?\/(.*?)$/.exec(spec);
      conf.name   = urlM[7]
      conf.port   = urlM[6]
      conf.host = urlM[4]
      conf.username = urlM[2]
      conf.password = urlM[3]

      conf.port = conf.port ? parseInt(conf.port,10) : null
    }

    // pg conf properties
    conf.user  = conf.username
    conf.database = conf.name

    console.dir(conf)

    self.dbinst = new pg.Client(conf)

    self.dbinst.connect(function(err){
      if( !error({tag$:'init'},err,cb) ) {
        self.waitmillis = MIN_WAIT

        if( err) {
          cb(err)
        }
        else {
          seneca.log({tag$:'init'},'db open and authed for '+conf.username)
          cb(null,self)
        }
      }
      else {
        seneca.log({tag$:'init'},'db open')
        cb(null,self)
      }
    });
  }


  self.close$ = function(cb) {
    if( self.dbinst ) {
      self.dbinst.end(function(err){
        if ( err ) {
          seneca.fail( {code:'connection/end',store:self.name,error:err},cb )
        }          
      })
    }
  }


  self.save$ = function(args,cb) {
    var ent = args.ent

    var update = !!ent.id;   

    if( update ) {
      var query = updatestm(ent)

      self.dbinst.query(query,function(err,res){
        if( !error(args,err,cb) ) {
          seneca.log(args.tag$,'update',ent,mark)
          cb(null,ent)                    
        } 
        else {
          seneca.fail( {code:'update',tag:args.tag$,store:self.name,query:query,error:err},cb )
        }
      })
    }
    else {
      ent.id = uuid()

      var query = savestm(ent)

      self.dbinst.query(query,function(err, res){
        if( !error(args,err,cb) ) {
          seneca.log(args.tag$,'save',ent,mark)
          cb(null,ent)          
        } 
        else {
          seneca.fail( {code:'save',tag:args.tag$,store:self.name,query:query,error:err},cb )
        }
      })
    }
  }


  self.load$ = function(args,cb) {
    var qent = args.qent
    var q    = args.q

    var query = selectstm(qent,q)

    self.dbinst.query(query,function(err,res){
      if( !error(args,err,cb) ) {
        var ent = makeent(qent,res.rows[0])
        seneca.log(args.tag$,'load',ent,mark)
        cb(null,ent)
      }
      else {
        seneca.fail( {code:'load',tag:args.tag$,store:self.name,query:query,error:err},cb )        
      }
    })
  }


  self.list$ = function(args,cb) {
    var qent = args.qent
    var q    = args.q

    var list = []

    var query = selectstm(qent,q)

    var query = self.dbinst.query(query,function(err,res){
      if( !error(args,err,cb) ) {
        res.rows.forEach(function(row){
          var ent = makeent(qent,row)
          list.push(ent)
        })
        seneca.log(args.tag$,'list',list.length,list[0],mark)
        cb(null,list)
      }
      else {
        seneca.fail( {code:'list',tag:args.tag$,store:self.name,query:query,error:err},cb )        
      }
    })
  }


  self.remove$ = function(args,cb) {
    var qent = args.qent
    var q    = args.q

    if( q.all$ ) {
      var query = deletestm(qent,q)

      self.dbinst.query(query,function(err,res){
        if( !error(args,err,cb) ) {
          seneca.log(args.tag$,'remove',res.rowCount)
          cb(null, res.rowCount)
        }
        else {
          seneca.fail( {code:'remove',tag:args.tag$,store:self.name,query:query,error:err},cb )          
        }
      })
    }
    else {
      self.dbinst.query(selectstm(qent,q),function(err,res){
        if( !error(args,err,cb) ) {
          var entp = res.rows[0]
          var query = deletestm(qent,entp)

          self.dbinst.query(query, function(err,res){
            if( !error(args,err,cb) ) {
              seneca.log(args.tag$,'remove',res.rowCount)
              cb(null, res.rowCount)
            }
            else {
              seneca.fail( {code:'remove',tag:args.tag$,store:self.name,query:query,error:err},cb )              
            }
          })
        }
      })      
    }
  }


  var savestm = function(ent) {
    var stm = {}

    var table  = tablename(ent)
    var fields = ent.fields$()
    var entp   = makeentp(ent)

    var values = []
    var params = []
    
    var cnt = 0

    fields.forEach(function(field) {
      values.push(entp[field])
      params.push('$'+ ++cnt)
    })

    stm.text   = 'INSERT INTO '+table+' ('+fields+') values ('+params+')'
    stm.values = values
    
    return stm
  }


  var updatestm = function(ent) {
    var stm = {}

    var table  = tablename(ent)
    var fields = ent.fields$()
    var entp   = makeentp(ent)

    var values = []
    var params = []
    var cnt = 0

    fields.forEach( function(field) {
      if( !(_.isUndefined(ent[field]) || _.isNull(ent[field])) ) {
        values.push(entp[field])
        params.push(field+'=$'+ ++cnt)        
      }
    })

    stm.text   = "UPDATE "+table+" SET "+params+" WHERE id='"+ent.id+"'"
    stm.values = values

    return stm
  }


  var deletestm = function(qent,q) {
    var stm = {}

    var table = tablename(qent)
    var entp   = makeentp(qent)

    var values = []
    var params = []
    
    var cnt = 0

    var w = whereargs(entp,q)
    
    var wherestr = ''
    
    if( !_.isEmpty(w) && w.params.length > 0 ) {
      w.params.forEach( function(param) {
        params.push(param+'=$'+ ++cnt)
      })
      
      if( !_.isEmpty(w.values) ) {
        w.values.forEach( function(val){
          values.push(val)
        })
      }

      wherestr = " WHERE "+params.join(' AND ')
    }

    stm.text   = "DELETE FROM "+table+wherestr
    stm.values = values  

    return stm
  }


  var selectstm = function(qent,q) {
    var stm = {}

    var table = tablename(qent)
    var entp   = makeentp(qent)

    var values = []
    var params = []
    
    var cnt = 0

    var w = whereargs(entp,q)
    
    var wherestr = ''
    
    if( !_.isEmpty(w) && w.params.length > 0) {
      w.params.forEach( function(param) {
        params.push(param+'=$'+ ++cnt)
      })
      
      w.values.forEach(function(value){
        values.push(value)
      })

      wherestr = " WHERE "+params.join(' AND ')
    }

    var mq = metaquery(qent,q)

    var metastr = ' '+mq['params'].join(' ')

    stm.text   = "SELECT * FROM "+table+wherestr+metastr
    stm.values = values

    return stm
  }


  var whereargs = function(entp,q) {
    var w = {}

    w.params = []
    w.values = []
        
    var qok = fixquery(entp,q)
    
    for(var p in qok) {
      if ( qok[p] ){
        w.params.push(p)
        w.values.push(qok[p])
      }
    }

    return w
  }


  var fixquery = function(entp,q) {
    var qq = {};

    for( var qp in q ) {
      if( !qp.match(/\$$/) ) {
        qq[qp] = q[qp]
      }
    }

    if( _.isFunction(qq.id) ) {
      delete qq.id
    }

    return qq
  }


  var  makeentp = function(ent) {
    var entp = {}
    var fields = ent.fields$()

    fields.forEach(function(field){
      if( !_.isDate(ent[field]) && _.isObject(ent[field]) ) {
        entp[field] = JSON.stringify(ent[field])
      }
      else {
        entp[field] = ent[field]
      }
    })

    return entp
  }


  var makeent = function(ent,row) {
    var entp

    var fields = ent.fields$()

    if( !_.isUndefined(ent) && !_.isUndefined(row) ) {
      entp = {}
      fields.forEach(function(field){
        if( !_.isUndefined(row[field]) ) {
          if( !_.isDate(ent[field]) && _.isObject(ent[field]) ) {
            entp[field] = JSON.parse(row[field])
          }
          else {
            entp[field] = row[field]
          }
        }
      })
    }

    return ent.make$(entp)
  }


  var metaquery = function(qent,q) {
    var mq = {}

    mq.params = []
    mq.values = []

    if( q.sort$ ) {
      for( var sf in q.sort$ ) break;
      var sd = q.sort$[sf] < 0 ? 'ASC' : 'DESC'
      mq.params.push('ORDER BY '+sf+' '+sd)
    }

    if( q.limit$ ) {
      mq.params.push('LIMIT '+q.limit$)
    }

    return mq
  }


  var tablename = function (entity) {
    var canon = entity.canon$({object:true})
    
    return (canon.base?canon.base+'_':'')+canon.name
  }


  return self
}

exports.plugin = function() {
  return new PostgresStore()
}

