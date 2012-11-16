/* Copyright (c) 2010-2012 Richard Rodger */

var common  = require('../common');
var store   = require('./store');
var mysql   = require('mysql');

var eyes    = common.eyes;
var _       = common._;
var uuid    = common.uuid;

var MIN_WAIT = 16
var MAX_WAIT = 65336

var OBJECT_TYPE = 'o'
var ARRAY_TYPE = 'a'
var DATE_TYPE = 'd'
var SENECA_TYPE_COLUMN = 'seneca'

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
    entp = makeentp(ent)

    if ( update ) {
      // id received - execute an update
      var query = 'UPDATE ' + tablename(ent) + ' SET ? WHERE id=\'' + entp.id + '\''
      
      self.connection.query( query, entp, function( err, result ) {
        if ( err ) {
          return seneca.fail( {code:'save/update',tag:args.tag$,store:self.name,query:query,fields:fields,error:err},cb )
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
          return seneca.fail({code:'save/insert',tag:args.tag$,store:self.name,query:query,fields:fields,error:err},cb)
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
    self.connection.query( query, function( err, res, fields ){
      if ( err ) {
        seneca.fail( {code:'load',tag:args.tag$,store:self.name,query:query,error:err},cb )
      }
      else{
        var ent = makeent( qent, res[0] )
        seneca.log( args.tag$, 'load', ent )
        cb( null, ent )
      }
    });
  }


  /** load all matching entities */
  self.list$ = function( args, cb ){
    var qent  = args.qent
    var q     = args.q

    var queryfunc = makequeryfunc(qent,q)

    queryfunc( function( err, results ){
      if ( err ) {
        seneca.fail( {code:'list',tag:args.tag$,store:self.name,query:queryfunc.q,error:err},cb )
      }
      else{
        var list = []
        results.forEach( function(row){
          var ent = makeent(qent, row )
          list.push(ent)
        })
        cb( null, list )
      }
    });
  }


  /** remove one matching entity */
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

    var w = whereargs(makeentp(qent),q)
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

    var w = whereargs(makeentp(qent),q)
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


  function makequeryfunc(qent,q) {
    var qf
    if( _.isArray( q ) ) {
      if( q.native$ ) {
        qf = function(cb) { 
          var args = q.concat([cb])
          self.connection.query.apply( self.connection, args) 
        }
        qf.q = q
      }
      else {
        qf = function(cb) { self.connection.query( q[0], _.tail(q), cb) }
        qf.q = {q:q[0],v:_.tail(q)}
      }
    }
    else if( _.isObject( q ) ) {
      if( q.native$ ) {
        var nq = _.clone(q)
        delete nq.native$
        qf = function(cb) { self.connection.query( nq, cb) }
        qf.q = nq
      }
      else {
        var query = selectstm(qent,q)
        qf = function(cb) { self.connection.query( query, cb) }
        qf.q = query
      }
    }
    else {
      qf = function(cb) { self.connection.query( q, cb) }
      qf.q = q
    }

    return qf
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
      conf.user = urlM[2]
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
          seneca.log({tag$:'init'},'db opened and authed for user '+conf.user+'.')
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
          seneca.log({tag$:'init'},'db opened and authed for user '+conf.user+'.')
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



var makeentp = function(ent) {
  var entp = {}
  var fields = ent.fields$()

  var type = {}

  fields.forEach(function(field){
    if( _.isDate( ent[field]) ) {
      type[field] = DATE_TYPE;
    }
    else if( _.isArray( ent[field]) ) {
      type[field] = ARRAY_TYPE;
    }
    else if( _.isObject( ent[field]) ) {
      type[field] = OBJECT_TYPE;
    }

    if( !_.isDate( ent[field]) && _.isObject(ent[field]) ) {
      entp[field] = JSON.stringify(ent[field])
    }
    else {
      entp[field] = ent[field]
    }
  })

  if ( !_.isEmpty(type) ){
    entp[SENECA_TYPE_COLUMN] = JSON.stringify(type)
  }
  return entp
}


var makeent = function(ent,row) {
  var entp

  var fields = _.keys(row)
  
  var senecatype = {}

  if( !_.isUndefined(row[SENECA_TYPE_COLUMN]) && !_.isNull(row[SENECA_TYPE_COLUMN]) ){
    senecatype = JSON.parse( row[SENECA_TYPE_COLUMN] )
  }

  if( !_.isUndefined(ent) && !_.isUndefined(row) ) {
    entp = {}
    fields.forEach(function(field){
      if (SENECA_TYPE_COLUMN != field){
        if( _.isUndefined( senecatype[field]) ) {
          entp[field] = row[field]
        }
        else if (senecatype[field] == OBJECT_TYPE){
          entp[field] = JSON.parse(row[field])
        }
        else if (senecatype[field] == ARRAY_TYPE){
          entp[field] = JSON.parse(row[field])
        }
        else if (senecatype[field] == DATE_TYPE){
          entp[field] = new Date(row[field])
        }
      }
    })
  }

  return ent.make$(entp)
}



module.exports = new MySQLStore()
