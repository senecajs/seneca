/* Copyright © 2016-2018 Richard Rodger and other contributors, MIT License. */
'use strict'


// NEXT
// - raw log json is too deep
// - implement seneca-plain-logger - plain text for production
// - filtering is a core feature so provide api and options control for all loggers
// - loggers are just plugins, allow multiple, recognize by a mark 
// - this script should not be a plugin - it contains multiple plugins


// NOTES
// Valid log level values range from 100 to 999 inclusive only.


const Util = require('util')


// REMOVE
//var _ = require('lodash')

const Stringify = require('fast-safe-stringify')
const Print = require('./print')
const Common = require('./common')


const logging = {
  load_logger,
  build_log_spec,
  build_log,
  flat_logger,
  test_logger,
  json_logger,
}

module.exports = logging


const default_logspec = logging.default_logspec = {
  level: 'info',
  default_level: 'debug',
  level_text: {
    100: 'all',
    200: 'debug',
    300: 'info',
    400: 'warn',
    500: 'error',
    600: 'fatal',
    999: 'none',
  },
  logger: json_logger
}


const level_abbrev = logging.level_abbrev = {
  quiet: 'none',
  silent: 'none',
  any: 'all',
  all: 'all',
  print: 'debug',
  standard: 'info',
  test: 'warn'
}


// TODO: create concise production flat format
function flat_logger(entry) {

  //console.log(entry)
  
  var level_str = entry.level_name.toUpperCase()
  if(level_str.length < 5) {
    level_str += '_'.repeat(5-level_str.length)
  }
  level_str = level_str.substring(0,5)

  var da =
      null != entry.err ? [entry.err.message, entry.err.callpoint] :
      null != entry.res ? [entry.res] :
      null != entry.msg ? [entry.msg] :      
      Array.isArray(entry.data) ? entry.data :
      null != entry.data ? [entry.data] :
      []

  for(var i = 0; i < da.length; i++) {
    da[i] = 'object' === typeof(da[i]) ? Common.clean(da[i]) : da[i]
    da[i] = Util.inspect(da[i],{
      compact:true,
      depth:(entry.depth||3),
      breakLength:Infinity
    })
  }
  
  var data_str = da.join(' ')

  var plugin_str = null==entry.plugin_name?'':
      (entry.plugin_name+
       ((null==entry.plugin_tag||'-'==entry.plugin_tag)?'':'$'+entry.plugin_tag))
       
  var sb = [
    entry.isot,
    entry.seneca_id,
    level_str,
    (null==entry.kind?'log':entry.kind),
    (null==entry.case?'LOG':entry.case),
    plugin_str,
    (null==entry.pattern?'':entry.pattern),
    (null==entry.action?'':entry.action),
    (null==entry.idpath?'':entry.idpath),
    data_str,
    entry.callpoint ? Util.inspect(entry.callpoint) : ''
  ]
  
  console.log(sb.join(' ').substring(0,entry.maxlen||11111))
}


// TODO: make default
function json_logger(entry) {
  var logstr = Stringify(entry)
  Print.log(logstr)
}


function test_logger(entry) {
  try {
    var logstr = build_test_log(this, entry)
    Print.log(logstr)
  } catch (e) {
    Print.log(e, entry)
  }
}


function load_logger(instance, log_plugin) {
  log_plugin = log_plugin || logging

  var logger = log_plugin

  if('string' === typeof(logger)) {
    logger = logging[logger+'_logger']
  }
  
  // The logger is actually a seneca plugin that generates a logger function
  if(log_plugin.preload) {
    logger = log_plugin.preload.call(instance).extend.logger
  }
  
  if(2 == logger.length) {
    return function logger_legacy_adapter(entry) {
      return logger(this, entry)
    }
  }
  else {
    return logger
  }
}



function build_log_spec(self,flags) {
  flags = flags || {}
  var options = self.options()
  var orig_logspec = options.log

  //console.log('BLS orig', orig_logspec)
  
  // Canonize logspec into a standard object structure
  var logspec = Common.deep(
    { text_level:{} },
    'object' === typeof(orig_logspec) ? orig_logspec : default_logspec)

  //console.log('BUILD LOGSPEC level VVV', logspec.level)
  
  // Define reverse lookup of log level values by name
  Object.keys(logspec.level_text).forEach(val => {
    logspec.text_level[logspec.level_text[val]] = parseInt(val,10)
  })

  var text_level = logspec.text_level
  var level_text = logspec.level_text

  // logger can be set at top level as a convenience
  var logger = (options.internal && options.internal.logger) ||
      options.logger ||
      logspec.logger

  // console.log('LOGGER', logger, options.internal.logger, options.logger, logspec.logger)
  
  //console.log('BLS orig', orig_logspec)

  //console.log('BUILD LOGSPEC level CCC', logspec.level)
  
  // level can be set by abbreviation
  if ('string' === typeof orig_logspec) {
    let level_value = NaN
    let found_logger = null
    
    // abbreviation could be an actual log level name or value
    if(text_level[orig_logspec]) {
      logspec.level = orig_logspec
    }

    // otherwise resolve abbreviation to log level name
    else if(level_abbrev[orig_logspec]) {
      logspec.level = level_abbrev[orig_logspec]
    }
    
    else if(!isNaN(level_value = parseInt(orig_logspec,10))) {
      logspec.level = level_value
    }

    // set logger by name
    else if('function' === typeof(found_logger = logging[orig_logspec+'_logger'])) {
      logger = found_logger
    }
    
    //console.log('BLS ', orig_logspec, logging[orig_logspec+'_logger'])
  }

  // level value can be set directly
  else if('number' === typeof orig_logspec) {
    logspec.level = parseInt(orig_logspec,10)
  }

  else if('function' === typeof orig_logspec) {
    logger = orig_logspec
  }
  
  else if('object' !== typeof orig_logspec && null != orig_logspec) {
    throw Common.error('bad-logspec', {logspec: orig_logspec})
  }

  //console.log('BUILD LOGSPEC level XXX', logspec.level)
  
  // If level was a known level value, replace with level text,
  // otherwise leave as value (as string).
  logspec.level = level_text[logspec.level] || ''+logspec.level

  //console.log('BUILD LOGSPEC level ZZZ', logspec.level)
  
  // Set live log level value from log level name, and ensure in valid range
  var live_level =
      text_level[logspec.level] || parseInt(logspec.level,10)
  live_level =
    live_level < 100 ? 100 :
    999 < live_level ? 999 :
    live_level
  logspec.live_level = live_level

  
  if(logger) {
    logspec.logger = logger
  }

  var logopts = {
    log:logspec
  }

  if(false !== flags.set_options) {
    self.options(logopts)
  }
  
  //console.log('BUILD LOGSPEC OUT', logopts)
  
  return logspec
}


function build_log(self,flags) {
  var logspec = build_log_spec(self,flags)
  //console.log('LOGSPEC', logspec)
  
  // shortcut for direct access (avoids seneca.options() call)
  //self.private$.optioner.set({log:logspec})
  self.private$.logspec = logspec

  var logger = load_logger(self, logspec.logger)
  //console.log('LOGGER', logger)
  
  self.private$.logger = logger

  
  self.log = function log(entry) {
    var instance = this
    
    // Handle legacy entity call 
    if(instance.entity$) {
      instance = instance.private$.get_instance()
      entry = {data:Array.prototype.slice.call(arguments)}
    }
    else if('string' === typeof(entry)) {
      entry = {data:Array.prototype.slice.call(arguments)}
    }
    
    //console.log('ENTRY',instance,entry)
    
    var logspec = instance.private$.logspec
    entry.level = entry.level || logspec.default_level

    if('number' !== typeof(entry.level)) {
      entry.level = logspec.text_level[entry.level] ||
        logspec.text_level[logspec.default_level]
    }
    
    
    var now = new Date()

    // NOTE: don't overwrite entry data!
    
    entry.isot = entry.isot || now.toISOString()
    entry.when = entry.when || now.getTime()
    entry.level_name = entry.level_name || logspec.level_text[entry.level]
    entry.seneca_id = entry.seneca_id || instance.id

    if(instance.did) {
      entry.seneca_did = entry.seneca_did || instance.did
    }

    if(instance.fixedargs.plugin$) {
      entry.plugin_name = entry.plugin_name || instance.fixedargs.plugin$.name
      entry.plugin_tag = entry.plugin_tag || instance.fixedargs.plugin$.tag
    }

    //console.log('IPA', instance.private$.act)

    if(instance.private$.act) {
      entry.kind = entry.kind || 'act'
      entry.actid = entry.actid || instance.private$.act.meta.id
      entry.pattern = entry.pattern || instance.private$.act.meta.pattern
      entry.action = entry.action || instance.private$.act.def.id

      entry.idpath = instance.private$.act.meta.tx
      for(var i = 0; i < (instance.private$.act.meta.parents || []).length; i++) {
        entry.idpath += '.'+(instance.private$.act.meta.parents[i][1].split('/')[0])
      }
      entry.idpath += '.'+instance.private$.act.meta.mi
      //console.log(instance.private$.act.meta)
    }

    // Log event is called on all logs - they are not filtered by level
    instance.emit('log', entry)

    var level_match = logspec.live_level <= entry.level
    if(level_match) {
      instance.private$.logger.call(this, entry)
    }
    
    return this
  }

  self.log.self = () => self

  Object.keys(logspec.text_level).forEach((level_name)=>{
    self.log[level_name] =
      make_log_level(level_name,logspec)
  })                                      
}


function make_log_level(level_name, logspec) {
  var level = logspec.text_level[level_name]

  var log_level = function(entry) {
    var self = this.self()
    if('object' !== typeof(entry)) {
      entry = {
        data:Array.prototype.slice.call(arguments)
      }
    }

    entry.level = level

    return self.log(entry)
  }

  Object.defineProperty(log_level, "name", { value: "log_"+level_name });
  
  return log_level
}








/*
function logging() {
  // Everything is in preload as logging plugins are
  // a special case that need to be loaded before any calls to seneca.log.
}

logging.preload = function() {
  var seneca = this

  // TODO: temporary for seneca-repl
  seneca.__build_test_log__$$ = build_test_log

  var so = seneca.options()
  // console.log('OPTIONS.LOG', so.log)

  
  // DEPRECATED: so.log.basic
  var logspec = so.logspec || so.log.basic || {}
  //var logspec = so.log || so.log.basic || {}

  // console.log('LOGSPEC:', logspec)
  
  var origspec = logspec

  if ('string' === typeof logspec) {
    if ('quiet' === logspec) {
      logspec = { level: 'none' }
    } else if ('silent' === logspec) {
      logspec = { level: 'none' }
    } else if ('any' === logspec) {
      logspec = { level: 'debug+' }
    } else if ('all' === logspec) {
      logspec = { level: 'debug+' }
    } else if ('print' === logspec) {
      logspec = { level: 'debug+' }
    } else if ('standard' === logspec) {
      logspec = { level: 'info+' }
    } else if ('test' === logspec) {
      logspec = { level: 'warn+' }
    }

    // console.log('PRINT LOGSPEC', logspec)
    
    logspec.logger = print_logger
  }

  // NOTE: takes just one parameter, the log entry
  else if ('function' === typeof logspec) {
    logspec = Object.assign({
      ...logspec,
      logger: function(seneca, entry) {
        origspec.call(seneca, entry)
      }
    })
  } else {
    logspec.logger = print_logger
  }


  var logrouter = logfilter(logspec,so.log)

  var logger = function(seneca, entry) {
    if (logrouter(entry)) {
      logspec.logger(seneca, entry)
    }
  }

  // Test mode prints more readable logs
  if (so.test) {
    logger = function(seneca, data) {
      if (logrouter(data)) {
        try {
          var logstr = build_test_log(seneca, data)
          Print.log(logstr)
        } catch (e) {
          Print.log(data)
        }
      }
    }
  }

  return {
    extend: {
      logger: logger
    }
  }
}
*/


//function build_test_log(seneca, origspec, data) {
function build_test_log(seneca, data) {
  var logstr
  var time = data.when - seneca.start_time
  var datalen = seneca.private$.exports.options.debug.datalen

  //if ('test' === origspec || 'print' === origspec) {
    var logb = [
      time +
        '/' +
        seneca.id.substring(0, 2) +
        '/' +
        seneca.tag +
        ' ' +
        data.level_name.toUpperCase(),
      (data.kind || 'data') +
        (data.case ? '/' + data.case : '') +
        (data.meta ? (data.meta.sync ? '/s' : '/a') : '')
    ]

    if ('act' === data.kind) {
      if (data.meta) {
        logb.push(
          data.meta.id
            .split('/')
            .map(function(s) {
              return s.substring(0, 2)
            })
            .join('/')
        )

        logb.push(data.meta.pattern)
      }

      logb.push(
        Util.inspect(seneca.util.clean(data.result || data.msg))
          .replace(/\s+/g, '')
          .substring(0, datalen)
      )

      logb.push(data.actdef.id)

      if (data.notice) {
        logb.push(data.notice)
      }

      // TODO: err log should show err code

      if ('ERR' === data.case) {
        logb.push('\n\n' + data.err.stack + '\n' + data.caller + '\n')
      }
    } else if ('add' === data.kind) {
      logb.push(data.pattern)
      logb.push(data.name)
    } else if ('ready' === data.kind) {
      logb.push(data.name)
    } else if ('plugin' === data.kind) {
      logb.push(
        data.plugin_name + (data.plugin_tag ? '$' + data.plugin_tag : '')
      )
    } else if ('options' === data.kind) {
      // deliberately omit
    } else if ('notice' === data.kind) {
      logb.push(data.notice)
    } else if ('listen' === data.kind || 'client' === data.kind) {
      var config = data.options && data.options[0]
      logb.push(
        [
          config.type,
          config.pin,
          config.host,
          'function' === typeof(config.port) ? '' : config.port
        ].join(';')
      )
    } else {
      logb.push(
        Util.inspect(data)
          .replace(/\n/g, ' ')
          .substring(0, datalen)
      )
    }

    if (data.did) {
      logb.push(data.did)
    }

    logstr = logb.join('\t')
    /*
} else {
    logstr = Util.inspect(data, { depth: null })
    logstr =
      time +
      ':\n\t' +
      logstr.replace(/\n/g, '\n\t') +
      '\n------------------------------------------------\n\n'
  }
    */
  
  return logstr
}

// TODO: needs massive refactor
/*
function logfilter(options, log_opts) {
  let level = ('string'===typeof(options.level) ? options.level : null) || 'info+'
  // console.log('LOGFILTER LEVEL', level, options.level)

  
  let calculatedLevels = []

  if (level_exists(level)) {
    calculatedLevels.push(level)
  } else if (_.endsWith(level, '+')) {
    // Level + notation
    calculatedLevels = log_level_plus(level.substring(0, level.length - 1))
  } else {
    // No level nor level+... it must be a custom alias
    let processedAliases = Object.assign({}, aliases, options.aliases)
    let aliasInfo = processedAliases[level]
    if (aliasInfo) {
      let handled = _.get(aliasInfo, 'handled', true)
      if (handled) {
        calculatedLevels = aliasInfo.handler(options)
      }
    }
  }

  return function filter(data) {
    if('number'===typeof(data.level)) {
      data.level = log_opts.level_text[data.level]
    }

    if (calculatedLevels.indexOf(data.level) !== -1) {
      return data
    }

    return null
  }
}

var aliases = {
  silent: {
    handled: true,
    handler: function() {
      return []
    }
  },
  all: {
    handled: true,
    handler: function() {
      return ['debug', 'info', 'warn', 'error', 'fatal']
    }
  },
  test: {
    handled: true,
    handler: function() {
      return ['error', 'fatal']
    }
  }
}

const log_levels = ['debug', 'info', 'warn', 'error', 'fatal']

function log_level_plus(logLevel) {
  let index = log_levels.indexOf(logLevel)
  if (index < 0) {
    return []
  } else {
    return log_levels.slice(index, log_levels.length)
  }
}

function level_exists(level) {
  return log_levels.indexOf(level) !== -1
}

module.exports.log_level_plus = log_level_plus
module.exports.level_exists = level_exists
*/
