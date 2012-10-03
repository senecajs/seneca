/* Copyright (c) 2010-2012 Richard Rodger */

var common  = require('../common');
var store   = require('./store');
var mysql   = require('mysql');

var eyes    = common.eyes;
var _       = common._;
var uuid    = common.uuid;

var MIN_WAIT = 16
var MAX_WAIT = 65336

function MySQLStore() {
  var self   = new store.Store()
  var parent = self.parent()

  var inid   = common.idgen(12)
  var seneca
  var connection

  self.name  = 'mysql-store'


  /** create or update an entity */
  self.save$ = function(args,cb){
    // entity to save
    var ent  = args.ent
    var q    = args.q

    var entp = {}

    //var canon = ent.canon$({object:true})

    var update = !!ent.id
    if( !ent.id ) {
      ent.id = uuid()
    }


    // TODO: move to Store
    var fields = ent.fields$()
    fields.forEach( function(field) {
      entp[field] = ent[field]
    })
    

    if ( update ) {
      // id received - execute an update
      var query = 'UPDATE ' + tablename(ent) + ' SET ? WHERE id=\'' + entp.id + '\''
      
      self.connection.query( query, entp, function( err, result ) {
        if ( err ) {
          seneca.fail( {code:'save/update',tag:args.tag$,store:self.name,query:query,fields:fields,error:err},cb )
        }
        else {
          seneca.log( args.tag$,'save/update',result )
          cb( null, ent )
        }
      });
    }
    else {
      // no id received - execute an insert
      var query = 'INSERT INTO ' + tablename(ent) + ' SET ?'
      
      self.connection.query( query, entp, function( err, result ) {
        if ( err ){
          seneca.fail({code:'save/insert',tag:args.tag$,store:self.name,query:query,fields:fields,error:err},cb)
        }
        else {
          seneca.log( args.tag$,'save/insert', result, query )
          cb( null, ent )
        }
      })
    }
  }


  /** load the first matching entity */
  self.load$ = function( args, cb ){
    var q    = _.clone( args.q )
    var qent = args.qent
    q.limit$ = 1

    var query= selectstm(qent,q)

    self.connection.query( query, function( err, results ){
      if ( err ) {
        seneca.fail( {code:'load',tag:args.tag$,store:self.name,query:query,error:err},cb )
      }
      else{
        cb( null, results[0] || null )
      }
    });
  }


  /** load all matching entities */
  self.list$ = function( args, cb ){
    var qent  = args.qent
    var q     = args.q
    var query = selectstm(qent,q)

    self.connection.query( query, function( err, results ){
      if ( err ) {
        seneca.fail( {code:'list',tag:args.tag$,store:self.name,query:query,error:err},cb )
      }
      else{
        cb( null, results )
      }
    });
  }


  /** remove all matching entities */
  self.remove$ = function(args,cb){
    var qent = args.qent
    var q    = args.q
    var query= deletestm(qent, q)

    self.connection.query( query, function( err, result ) {
      if ( err ){
        seneca.fail( {code:'remove',tag:args.tag$,store:self.name,query:query,error:err},cb )
      }
      else{
        cb( null, result )
      }
    })
  }


  /** close connection to data store - called during shutdown */
  self.close$ = function( args, cb ){
    if( self.connection ) {
      self.connection.end(function ( err ) {
        if ( err ) {
          seneca.fail( {code:'connection/end',store:self.name,error:err},cb )
        }
        else cb();
      })
    }
    else cb();
  }


  var deletestm = function(qent,q) {
    var table = tablename(qent)
    var params = []

    var w = whereargs(qent,q)
    var wherestr = ''
    
    if( !_.isEmpty(w) ) {
      for(var param in w) {
        params.push(param + ' = ' + self.connection.escape(w[param]))
      }
    
      wherestr = " WHERE "+params.join(' AND ')
    }

    var limistr = ''
    if( !q.all$ ) {
      limistr = ' LIMIT 1'
    }

    return "DELETE FROM " + table + wherestr + limistr
  }


  var selectstm = function(qent,q) {
    var table = tablename(qent)
    var params = []

    var w = whereargs(qent,q)
    var wherestr = ''
    
    if( !_.isEmpty(w) ) {
      for(var param in w) {
        params.push(param + ' = ' + self.connection.escape(w[param]))
      }
    
      wherestr = " WHERE "+params.join(' AND ')
    }

    var mq = metaquery(qent,q)
    var metastr = ' ' + mq.join(' ')

    return "SELECT * FROM " + table + wherestr + metastr
  }


  var metaquery = function(qent,q) {
    var mq = []

    if( q.sort$ ) {
      for( var sf in q.sort$ ) break;
      var sd = q.sort$[sf] < 0 ? 'ASC' : 'DESC'
      mq.push('ORDER BY '+sf+' '+sd)
    }

    if( q.limit$ ) {
      mq.push('LIMIT '+q.limit$)
    }

    return mq
  }


  var tablename = function (entity) {
    var canon = entity.canon$({object:true})
    return (canon.base?canon.base+'_':'')+canon.name
  }


  var whereargs = function(qent,q) {
    var w = {}
        
    var qok = fixquery(qent,q)

    for(var p in qok) {
      w[p] = qok[p]
    }

    return w
  }


  var fixquery = function(qent,q) {
    var qq = {};
    for( var qp in q ) {
      if( !qp.match(/\$$/) ) {
        qq[qp] = q[qp]
      }
    }
    return qq
  }




  self.configure = function( spec, cb ) {
    self.spec = spec

    var conf = 'string' == typeof(spec) ? null : spec

    if( !conf ) {
      conf = {}
      //mysql://user:pass@host:port/db
      var urlM = /^mysql:\/\/((.*?):(.*?)@)?(.*?)(:?(\d+))?\/(.*?)$/.exec(spec);
      conf.name   = urlM[7]
      conf.port   = urlM[6]
      conf.server = urlM[4]
      conf.username = urlM[2]
      conf.password = urlM[3]

      conf.port = conf.port ? parseInt(conf.port,10) : null
    }

    self.connection = mysql.createConnection({
      host     : conf.host,
      user     : conf.user,
      password : conf.password,
      database : conf.name,
    })

    handleDisconnect();
    self.connection.connect( function( err ) {
      if( !error({tag$:'init'},err,cb) ) {
        self.waitmillis = MIN_WAIT

        if( err ) {
          cb( err )
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

  function handleDisconnect() {
    self.connection.on( 'error', function(err) {
      if( !error({tag$:'init'},err,cb) ) {
        self.waitmillis = MIN_WAIT

        if( err ) {
          cb( err )
        }
        else {
          seneca.log({tag$:'init'},'db open and authed for '+conf.username)
          cb( null,self )
        }
      }
      else {
        seneca.log({tag$:'init'},'db open')
        cb(null,self)
      }
      
    });
  }

  function reconnect(){
    self.configure(self.spec, function( err, me ){
      if( err ) {
        seneca.log( null, 'db reconnect (wait ' + self.waitmillis + 'ms) failed: ' + err )
        self.waitmillis = Math.min( 2 * self.waitmillis, MAX_WAIT )
        setTimeout( function(){ reconnect()}, self.waitmillis )
      }
      else {
        self.waitmillis = MIN_WAIT
        seneca.log(null,'reconnect ok')
      }
    })
  }

  /** called by seneca to initialise plugin */
  self.init = function( si, opts, cb ) {
    parent.init( si,opts,function(){

      // keep a reference to the seneca instance
      seneca = si

      self.configure( opts,function( err ) {
        if( err ) {
          return seneca.fail( {code:'entity',store:self.name,error:err}, cb )
        } 
        else cb();
      })
    })
  }


  return self
}

function error( args, err, cb ) {
  if( err ) {
    if ( !err.fatal ) {
      return false;
    }

    seneca.log( args.tag$, 'error: ' + err )
    seneca.fail({code:'entity/error',store:self.name},cb)

      if ( 'PROTOCOL_CONNECTION_LOST' !== err.code ) {
        throw err;
      }


    if( MIN_WAIT == self.waitmillis ) {
      self.collmap = {}
      reconnect()
    }

    return true
  }

  return false
}


module.exports = new MySQLStore()
