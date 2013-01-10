/* Copyright (c) 2010-2012 Richard Rodger */

var common  = require('../common');
var store   = require('./store');

var eyes    = common.eyes;
var _       = common._;
var uuid    = common.uuid;


function NoopStore() {
  var self   = new store.Store()
  var parent = self.parent()

  var inid   = common.idgen(12)
  var seneca

  self.name = 'noop-store'



  /** create or update an entity */
  self.save$ = function(args,cb){

    // entity to save
    var ent = args.ent

    if( !ent.id ) {
      // TODO: should be a default seneca action on util plugin - then it can be overwritten
      ent.id = uuid()
    }
    
    // get entity type designation: zone/base/name
    // zone and/or base could be undefined
    var canon = ent.canon$({object:true})
    var base = canon.base
    var name = canon.name
    var zone = canon.zone
        
    // do nothing - save operation would go here

    // conventional log format for data store operations
    // args.tag$ is a seneca generate per-operation tag to track individual operations
    seneca.log(args.tag$,'save',ent,inid)

    // follow normal callback convention for errors
    var err = null
    cb(null,ent)
  }



  /** Load the first matching entity.
   *  The query must either be a set of properties, and all property values must match,
   *  or a single string value, equal to the entity id
   *  The sort$ operation is supported. There is an implicit limit$ = 1
   */
  self.load$ = function(args,cb){

    // entity performing query - use qent.canon$() to get entity type
    var qent = args.qent

    // query string or object
    var q = args.q

    var foundent = null

    // do nothing - load operation would go here

    seneca.log(args.tag$,'load',foundent,inid)

    var err = null
    cb(err,foundent)
  }



  /** Load all matching entities. 
   *  The query depends on the args.q value:
   *  object => AND query on property values
   *  object with native$=true => pass object through to underlying driver, delete native$
   *  array => call driver query with element 0 as query string, and remaining elements as values
   *  array with native$=true property => pass through to underlying driver as arguments
   *  string => use verbatim as query - user must escape values!
   */
  self.list$ = function(args,cb){

    // as per load$
    var qent = args.qent
    var q    = args.q

    var list = []

    // do nothing - list operation would go here

    seneca.log(args.tag$,'list',list.length,list[0])

    var err = null
    cb(err, list)
  }



  /** Remove one matching entity. 
   *  If all$=true, remove all matching entities.
   */
  self.remove$ = function(args,cb){

    // as per load$
    var qent = args.qent
    var q    = args.q

    var list = []

    // do nothing - remove operation would go here
    seneca.log(args.tag$,'remove',list[0])

    var err = null

    // remove returns data of deleted entities
    cb(err,list)
  }



  /** close connection to data store - called during shutdown */
  self.close$ = function(args,cb){
    seneca.log(args.tag$,'close')
    cb()
  }



  /** called by seneca to initialise plugin */
  self.init = function(si,opts,cb) {
    parent.init(si,opts,function(){

      // keep a reference to the seneca instance
      seneca = si
      cb()
    })
  }


  return self
}


exports.plugin = function() {
  return new NoopStore()
}

