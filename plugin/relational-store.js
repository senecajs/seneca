/* Base class for relational databases */

var store = require('./store');

common    = require('../common');

eyes      = common.eyes;
_         = common._;
uuid      = common.uuid;

var nid = require('nid')


var MIN_WAIT = 16
var MAX_WAIT = 65336


function RelationalStore() {
  var self  = store.Store()

  SENECA_TYPE_COLUMN = 'seneca'

  OBJECT_TYPE = 'o'
  ARRAY_TYPE  = 'a'
  DATE_TYPE   = 'd'

  mark = nid()

  self.waitmillis = MIN_WAIT
  self.dbinst     = null


  error = function(args,err,cb) {
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


  reconnect = function(args) {
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

  self.close$ = function(cb) {
    if( self.dbinst ) {
      self.dbinst.end(function(err){
        if ( err ) {
          seneca.fail( {code:'connection/end',store:self.name,error:err},cb )
        }
      })
    }
  }


  fixquery = function(entp,q) {
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


  /**
   * Create a new persistable entity from the entity object. The function adds
   * the value for SENECA_TYPE_COLUMN with hints for type of the serialized objects.
   *
   * @param ent entity
   * @return {Object}
   */
  makeentp = function(ent) {
    var entp   = {}
    var type   = {}
    var fields = ent.fields$()

    fields.forEach(function(field){
      if( _.isDate( ent[field]) ) {
        type[field] = DATE_TYPE;
        entp[field] = JSON.stringify(ent[field])
      }
      else if( _.isArray( ent[field]) ) {
        type[field] = ARRAY_TYPE;
        entp[field] = JSON.stringify(ent[field])
      }
      else if( _.isObject( ent[field]) ) {
        type[field] = OBJECT_TYPE;
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


  /**
   * Create a new entity using a row from database. This function is using type
   * hints from database column SENECA_TYPE_COLUMN to deserialize stored values
   * into proper objects.
   *
   * @param ent entity
   * @param row database row data
   * @return {Entity}
   */
  makeent = function(ent,row) {
    var entp       = {}
    var senecatype = {}
    var fields      = _.keys(row)

    if( !_.isUndefined(row[SENECA_TYPE_COLUMN]) && !_.isNull(row[SENECA_TYPE_COLUMN]) ){
      senecatype = JSON.parse( row[SENECA_TYPE_COLUMN] )
    }

    if( !_.isUndefined(ent) && !_.isUndefined(row) ) {
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


  tablename = function (entity) {
    var canon = entity.canon$({object:true})

    return (canon.base?canon.base+'_':'')+canon.name
  }


  return self
}

exports.RelationalStore = RelationalStore
