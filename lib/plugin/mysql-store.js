/* Copyright (c) 2010-2012 Richard Rodger */

var common  = require('../common');
var store   = require('./store');
var mysql   = require('mysql');

var eyes    = common.eyes;
var _       = common._;
var uuid    = common.uuid;


function MySQLStore() {
  var self   = new store.Store()
  var parent = self.parent()

  var inid   = common.idgen(12)
  var seneca
  var connection
  var entities = new Array();

  self.name  = 'mysql-store'

  /** create or update an entity */
  self.save$ = function(args,cb){

    // entity to save
    var ent = args.ent

    var canon = ent.canon$({object:true})

    var update = !!ent.id;
    if( !ent.id ) {
      ent.id = uuid()
    }
    
    // get entity type designation: zone/base/name
    // zone and/or base could be undefined
    var base = canon.base
    var name = canon.name
    var zone = canon.zone

    if ( update ) {
      // id received - execute an update
      var qstr = []
      qstr.push('UPDATE ')
      qstr.push(getTableName(canon))
      qstr.push(' SET ? ')
      qstr.push(' WHERE id=\'')
      qstr.push(ent.id)
      qstr.push('\'')
      
      var query = qstr.join('')
      
      self.connection.query( query, ent, function( err, result ) {
        if ( err ){
          seneca.fail( {code:'save/update',store:self.name,error:err},cb )
          cb( err, null )
        }
        else {
          seneca.log( args.tag$,'save/update',result )
          // load from db to make sure is ok
          ent.load$({}, function(err, result){
            if ( err ){
              seneca.fail ( args.tag$,'save/load',err )
              cb( err, null )
            }
            else{
              cb( err, ent.make$(result) )  
            }
          })
        }
      });
    }
    else {
      // no id received - execute an insert
      var qstr = []
      qstr.push('INSERT INTO ')
      qstr.push(getTableName(canon))
      qstr.push(' SET ?')
      
      var query = qstr.join('')
      
      self.connection.query( query, ent, function( err, result ) {
        if ( err ){
          seneca.fail({code:'save/insert',store:self.name,error:err},cb)
          cb( err, ent )
        }
        else {
          seneca.log( args.tag$,'save/insert',ent )
          // load from db to make sure is ok
          ent.load$({}, function(err, result){
            if ( err ){
              seneca.fail ( args.tag$,'save/load',err )
              cb( err, null )
            }
            else{
              cb( err, ent.make$(result) )  
            }
          })
        }
      });
    }
  }

  /** load the first matching entity */
  self.load$ = function( args, cb ){
    var query = createquery(args) + ' limit 1'

    self.connection.query( query, function( err, results ){
      if (err){
        cb(err)
      }
      else{
        if ( results.length > 0 ){
          cb( null, results[0] )
        }
        else{
          cb( null, null )
        }
      }
    });
  }

  /** load all matching entities */
  self.list$ = function( args, cb ){
    var query = createquery( args )
    self.connection.query( query, function( err, results ){
      if ( err ) {
        cb( err )
      }
      else{
        cb( null, results )
      }
    });
  }

  function createquery(args){
    var ent = args.ent
    var qent = args.qent

    // get entity type designation: zone/base/name
    // zone and/or base could be undefined
    var canon = ent.canon$({object:true})
    var base = canon.base
    var name = canon.name
    var zone = canon.zone

    var qstr = []
    qstr.push('SELECT * FROM ')
    qstr.push( getTableName( canon ) )

    whereClause = createwhereclause( args )

    return qstr.join('') + ( (whereClause.length > 0) ? ' WHERE ' + whereClause: '' )
  }

  function createwhereclause( args ) {
    var ent = args.ent
    conds = []
    condsstr = []
    var fields = ent.fields$()

    fields.forEach( function(field) {
      condsstr.push(field + ' = ' + self.connection.escape(ent[field]))
    })
    
    return condsstr.join(' AND  ')
  }

  /** remove all matching entities */
  self.remove$ = function(args,cb){

    // as per load$
    var ent = args.ent
    var qent = args.qent
    var q    = args.q
    var query

    // get entity type designation: zone/base/name
    // zone and/or base could be undefined
    var canon = ent.canon$({object:true})
    var base = canon.base
    var name = canon.name
    var zone = canon.zone

    var qstr = []
    qstr.push( 'DELETE FROM ' )
    qstr.push( getTableName( canon ) )

    whereClause = createwhereclause( args )

    query = qstr.join('') + ( (whereClause.length > 0) ? ' WHERE ' + whereClause: '' )
    if( !q.all$ ) {
      query += ' LIMIT 1'
    }

    self.connection.query( query, function( err, result ) {
      if ( err ){
        cb( err )
      }
      else{
        cb( null, result )
      }
    })
  }

  function getTableName( canon ){
      return ( canon.base ? canon.base + '_':'' ) + canon.name
  }


  /** close connection to data store - called during shutdown */
  self.close$ = function( args, cb ){
    if( self.connection ) {
        self.connection.end(function ( err ) {
            if ( err ) {
              seneca.fail( {code:'connection/end',store:self.name,error:err},cb )
            }
          });    
    }
    else{
      seneca.fail( {code:'connection/end already closed',store:self.name},cb )
    }
    seneca.log( args.tag$,'close' )
    cb()
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

    handleDisconnect( self.connection );
    self.connection.connect( function( err ) {
      if( err ) {
        seneca.fail( {code:'init/connect',store:self.name,error:err},cb )
        cb( err )
      }
      else{
        cb( null, self )
      }
    });
  }

  function handleDisconnect( connection ) {
    self.connection.on( 'error', function(err) {
      if ( !err.fatal ) {
        return;
      }

      if ( err.code !== 'PROTOCOL_CONNECTION_LOST' ) {
        throw err;
      }

      seneca.log( null, 'Re-connecting lost connection', err.stack );

      self.connection = mysql.createConnection( self.connection.config );
      handleDisconnect( self.connection );
      self.connection.connect();
    });
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


exports.plugin = function() {
  return new MySQLStore()
}

