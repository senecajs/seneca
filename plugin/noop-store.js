/* Copyright (c) 2010-2013 Richard Rodger */

"use strict"


var _       = require('underscore')
var uuid    = require('node-uuid')


// plugin init function
module.exports = function(seneca,opts,cb) {

  // added to logs to provide extra context info
  var desc


  // storage operations
  var store = {

    // the name of the data store
    name: 'noop-store',


    /** create or update an entity */
    save: function(args,cb){

      // entity to save
      var ent = args.ent

      // if there's no id, it's a new entity
      var create = !ent.id

      if( create ) {
        // TODO: should be a default seneca action on util plugin - then it can be overwritten
        ent.id = uuid()
      }
    
      // get entity type designation: zone/base/name
      // ZONE SHOULD BE IGNORED
      var canon = ent.canon$({object:true})
      var base = canon.base
      var name = canon.name

      // save operation would goes here

      // conventional log format for save operations
      // args.actid$ is a per-action tag to track individual actions
      seneca.log(args.actid$,'save/'+(create?'insert':'update'),ent,desc)

      // follow normal callback convention for errors
      var err = null
      cb(null,ent)
    },



    /** Load the first matching entity.
     *  The query must either be a set of properties, and all property values must match,
     *  or a single string value, equal to the entity id
     *  The sort$ operation is supported. There is an implicit limit$ = 1
     */
    load: function(args,cb){

      // entity performing query - use qent.canon$() as above to get entity type
      var qent = args.qent

      // query string or object
      var q = args.q

      // load operation would go here
      var foundent = null

      // conventional log format for load operations
      seneca.log(args.actid$,'load',q,foundent,desc)

      var err = null
      cb(err,foundent)
    },



    /** Load all matching entities. 
     *  The query depends on the args.q value:
     *  object => AND query on property values
     *  object with native$=true => pass object through to underlying driver, delete native$
     *  array => call driver query with element 0 as query string, and remaining elements as values
     *  array with native$=true property => pass through to underlying driver as arguments
     *  string => use verbatim as query - user must escape values!
     */
    list: function(args,cb){

      // as per load
      var qent = args.qent
      var q    = args.q

      // list operation would go here
      var list = []

      // log the first item in the list, if any
      seneca.log(args.actid$,'list',q,list.length,list[0],desc)

      var err = null
      cb(err, list)
    },



    /** Remove one matching entity. 
     *  If all$=true, remove all matching entities.
     *  If load$=true, return entity data (ignored if all$=true)
     */
    remove: function(args,cb){
      var qent = args.qent
      var q    = args.q

      // remove operation would go here
      var ent = null

      seneca.log(args.actid$,'remove/'+(all?'all':'one'),q,ent,desc)

      var err = null

      // remove returns data of deleted entity
      cb(err,ent)
    }



    /** close connection to data store - called during shutdown */
    close: function(args,cb){
      seneca.log(args.actid$,'close',desc)
      cb()
    }
  }


  // initstore is a utility function to setup data storage cmds
  // in pattern: {role:store.name,cmd:save,load,list,remove,close}
  seneca.util.initstore(seneca,opts,store,function(err,tag,description){
    if( err ) return cb(err);
    
    desc = description

    // ensures name and plugin instance tag are set if plugin is require'd directly
    cb(null,{name:store.name,tag:tag})
  })

}


