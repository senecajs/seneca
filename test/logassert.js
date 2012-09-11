
var assert = require('assert')
var util   = require('util')
var _   = require('underscore')


function own(obj){
  if( obj ) {
    var sb = ['{']
    for( var p in obj ) {
      if( obj.hasOwnProperty(p) && '$'!=p.charAt(p.length-1)) {
        sb.push(p)
        sb.push('=')
        sb.push(obj[p])
        sb.push(',')
      }
    }
    sb.push('}')
    return sb.join('')
  }
  else {
    return null
  }
}


module.exports = function(expected) {
  var index   = 0
  var history = []

  var logger = function(date,type) {
    history.push(arguments)

    var args = Array.prototype.slice.call(arguments)
    args.unshift('ASSERTLOG:')

    var argstrs = []
    args.forEach(function(a){
      //require('eyes').inspect(a)
      //util.debug('### '+(a?(a+' '+a.$):null))
      argstrs.push(null==a?a:
                   'string'==typeof(a)?a:
                   'number'==typeof(a)?a:
                   _.isDate(a)?(a.getTime()%1000000):
                   a.hasOwnProperty('toString')?''+a:own(a)
                   //a.$?own(a):
                   //(require('eyes').inspect(a),JSON.stringify(a))
                  )
    })
    util.debug( argstrs.join('\t') )
    

    function check(expecting,found,index) {
      if( expecting != found ) {
        assert.fail((index?index+': ':'')+expecting+' != '+found)
      }
    }

    var expect = (expected && expected[index]) || null
    if( 'string'==typeof(expect) ) {
      check(expect,type)
    }
    else if( null != expect && 0 < expect.length ) {
      check(expect[0],type)
      for(var i = 1; i < expect.length; i++ ) {
        check(expect[i],arguments[i+1],i)
      }
    }

    index++
  }

  logger.index   = function(){ return index }
  logger.history = history
  logger.len     = expected.length

  return logger
}