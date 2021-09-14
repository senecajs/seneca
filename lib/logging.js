/* Copyright © 2016-2019 Richard Rodger and other contributors, MIT License. */
'use strict'

// NOTES
// Valid log level values range from 100 to 999 inclusive only.

const Util = require('util')

const Common = require('./common')

const default_logspec = {
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
  logger: json_logger,
}

const level_abbrev = {
  quiet: 'none',
  silent: 'none',
  any: 'all',
  all: 'all',
  print: 'debug',
  standard: 'info',
  test: 'warn',
}

const internal_loggers = {
  flat_logger,
  test_logger,
  json_logger,
}

function make_logging() {
  const logging = {
    default_logspec: Common.deep(default_logspec),
    level_abbrev: Common.deep(level_abbrev),
    load_logger,
    build_log_spec,
    build_log,
    flat_logger,
    test_logger,
    json_logger,
  }
  return logging
}

module.exports = make_logging

function flat_logger(entry) {
  let opts = this.options()
  var datalen = opts.debug.datalen || 111

  var level_str = (entry.level_name + '').toUpperCase()
  if (level_str.length < 5) {
    level_str += '_'.repeat(5 - level_str.length)
  }
  level_str = level_str.substring(0, 5)

  var data_src =
    null != entry.err
      ? [
          entry.err.message,
          entry.err.callpoint,
          entry.err.plugin || '',
          entry.err.plugin_callpoint || '',
        ]
      : null != entry.res
      ? [entry.res]
      : null != entry.msg
      ? [entry.msg]
      : Array.isArray(entry.data)
      ? entry.data
      : null != entry.data
      ? [entry.data]
      : []

  var data_fmt = new Array(data_src.length)
  for (var i = 0; i < data_src.length; i++) {
    data_fmt[i] =
      data_src[i] && 'object' === typeof data_src[i]
        ? Common.clean(data_src[i])
        : data_src[i]
    data_fmt[i] = Util.inspect(data_fmt[i], {
      compact: true,
      depth: entry.depth$ || 3,
      breakLength: Infinity,
    })
  }

  var data_str = data_fmt.join(' ')

  data_str =
    data_str.substring(0, datalen) + (datalen < data_str.length ? '...' : '')

  var plugin_str =
    null == entry.plugin_name
      ? ''
      : entry.plugin_name +
        (null == entry.plugin_tag || '-' == entry.plugin_tag
          ? ''
          : '$' + entry.plugin_tag)

  var sb = [
    entry.isot,
    'string' === typeof entry.seneca_id
      ? entry.seneca_id.substring(0, 5)
      : '-----',
    level_str,
    null == entry.kind ? 'log' : entry.kind,
    null == entry.case ? 'LOG' : entry.case,
    plugin_str,
    null == entry.pattern ? '' : entry.pattern,
    null == entry.action ? '' : entry.action,
    null == entry.idpath ? '' : entry.idpath,
    data_str,
    entry.callpoint ? Util.inspect(entry.callpoint) : '',
  ]

  this.private$.print.log(sb.join('\t').substring(0, entry.maxlen$ || 11111))
  if (entry.err && opts.debug.print.err) {
    this.private$.print.err(entry.err)
  }
}

// TODO: make default in 4.x
function json_logger(entry) {
  var logstr = Common.stringify(entry)
  this.private$.print.log(logstr)
}

function test_logger(entry) {
  try {
    var logstr = build_test_log(this, entry)
    this.private$.print.log(logstr)
  } catch (e) {
    this.private$.print.log(e, entry)
  }
}

function load_logger(instance, log_plugin) {
  log_plugin = log_plugin || json_logger

  var logger = log_plugin

  if ('string' === typeof logger) {
    logger = internal_loggers[logger + '_logger']
  }

  // The logger is actually a seneca plugin that generates a logger function
  if (log_plugin.preload) {
    logger = log_plugin.preload.call(instance).extend.logger
    logger.from_options$ = log_plugin.from_options$
  }

  if (2 == logger.length) {
    var lla = function logger_legacy_adapter(entry) {
      return logger(this, entry)
    }

    lla.from_options$ = logger.from_options$

    return lla
  } else {
    return logger
  }
}

function build_log_spec(self) {
  var options = self.options()
  var orig_logspec = options.log

  // Canonize logspec into a standard object structure
  var logspec = Common.deep(
    { text_level: {} },
    orig_logspec && 'object' === typeof orig_logspec
      ? orig_logspec
      : default_logspec
  )

  // Define reverse lookup of log level values by name
  Object.keys(logspec.level_text).forEach((val) => {
    logspec.text_level[logspec.level_text[val]] = parseInt(val, 10)
  })

  var text_level = logspec.text_level
  var level_text = logspec.level_text

  // logger can be set at top level as a convenience
  var logger =
    (options.internal && options.internal.logger) ||
    options.logger ||
    logspec.logger

  // level can be set by abbreviation
  if ('string' === typeof orig_logspec) {
    let level_value = null
    let found_logger = null

    // abbreviation could be an actual log level name or value
    if (text_level[orig_logspec]) {
      logspec.level = orig_logspec
    }

    // otherwise resolve abbreviation to log level name
    else if (level_abbrev[orig_logspec]) {
      logspec.level = level_abbrev[orig_logspec]
    } else if (!isNaN((level_value = parseInt(orig_logspec, 10)))) {
      logspec.level = level_value
    }

    // set logger by name
    else if (
      'function' ===
      typeof (found_logger = internal_loggers[orig_logspec + '_logger'])
    ) {
      logger = found_logger
    } else {
      throw Common.error('bad_logspec_string', { logspec: orig_logspec })
    }
  }

  // level value can be set directly
  else if ('number' === typeof orig_logspec) {
    logspec.level = parseInt(orig_logspec, 10)
  } else if ('function' === typeof orig_logspec) {
    logger = orig_logspec
  } else if (
    orig_logspec &&
    'object' !== typeof orig_logspec &&
    null != orig_logspec
  ) {
    throw Common.error('bad_logspec', { logspec: orig_logspec })
  }

  // If level was a known level value, replace with level text,
  // otherwise leave as value (as string).
  logspec.level = level_text[logspec.level] || '' + logspec.level

  // Set live log level value from log level name, and ensure in valid range
  var live_level = text_level[logspec.level] || parseInt(logspec.level, 10)
  live_level = live_level < 100 ? 100 : 999 < live_level ? 999 : live_level
  logspec.live_level = live_level

  if (logger) {
    logspec.logger = logger
  }

  return logspec
}

function build_log(self) {
  var logspec = build_log_spec(self)

  // shortcut for direct access (avoids seneca.options() call)
  self.private$.logspec = logspec

  var logger = load_logger(self, logspec.logger)

  self.private$.logger = logger

  self.log = function log(entry) {
    var instance = this

    // // WWW
    // if('action_timeout' === entry.code) {
    //   return
    // }

    // // WWW
    // if(entry.err){
    //   if(entry.err.logged$) {
    //     return
    //   }
    //   else {
    //     entry.err.logged$ = true
    //   }
    // }

    // Handle legacy entity call
    if (instance.entity$) {
      instance = instance.private$.get_instance()
      entry = { data: Array.prototype.slice.call(arguments) }
    } else if ('string' === typeof entry) {
      entry = { data: Array.prototype.slice.call(arguments) }
    }

    var logspec = instance.private$.logspec
    entry.level = entry.level || logspec.default_level

    if ('number' !== typeof entry.level) {
      entry.level =
        logspec.text_level[entry.level] ||
        logspec.text_level[logspec.default_level]
    }

    var now = new Date()

    // NOTE: don't overwrite entry data!

    entry.isot = entry.isot || now.toISOString()
    entry.when = entry.when || now.getTime()
    entry.level_name = entry.level_name || logspec.level_text[entry.level]
    entry.seneca_id = entry.seneca_id || instance.id

    if (instance.did) {
      entry.seneca_did = entry.seneca_did || instance.did
    }

    if (instance.fixedargs.plugin$) {
      entry.plugin_name = entry.plugin_name || instance.fixedargs.plugin$.name
      entry.plugin_tag = entry.plugin_tag || instance.fixedargs.plugin$.tag
    }

    if (instance.private$.act) {
      intern.build_act_entry(instance.private$.act, entry)
    }

    // Log event is called on all logs - they are not filtered by level
    instance.emit('log', entry)

    var level_match = logspec.live_level <= entry.level

    if (level_match) {
      instance.private$.logger.call(this, entry)
    }

    return this
  }

  self.log.self = () => self

  Object.keys(logspec.text_level).forEach((level_name) => {
    self.log[level_name] = make_log_level(level_name, logspec)
  })

  return logspec
}

function make_log_level(level_name, logspec) {
  var level = logspec.text_level[level_name]

  var log_level = function (entry) {
    var self = this.self()
    if (entry && 'object' !== typeof entry) {
      entry = {
        data: Array.prototype.slice.call(arguments),
      }
    }

    entry.level = level
    return self.log(entry)
  }

  Object.defineProperty(log_level, 'name', { value: 'log_' + level_name })

  return log_level
}

function build_test_log(seneca, data) {
  var logstr
  var time = data.when - seneca.start_time
  var exports = seneca.private$.exports
  var debug_opts = exports && exports.options && exports.options.debug
  var datalen = (debug_opts && debug_opts.datalen) || 111

  var logb = [
    time +
      '/' +
      seneca.id.substring(0, 2) +
      '/' +
      seneca.tag +
      ' ' +
      (data.level_name + '').toUpperCase(),
    (data.kind || 'data') +
      (data.case ? '/' + data.case : '') +
      (data.meta ? (data.meta.sync ? '/s' : '/a') : ''),
  ]

  if ('act' === data.kind) {
    if (data.meta) {
      logb.push(
        data.meta.id
          .split('/')
          .map(function (s) {
            return s.substring(0, 2)
          })
          .join('/')
      )

      logb.push(data.meta.pattern)
    }

    if (data.res || data.result || data.msg) {
      let obj = data.res || data.result || data.msg || {}

      let objstr = Util.inspect(seneca.util.clean(obj))
        .replace(/\s+/g, '')
        .substring(0, datalen)

      if (
        objstr.length <= 22 ||
        (!obj.$$logged$$ && (!data.err || !data.err.$$logged$$))
      ) {
        logb.push(objstr)
        obj.$$logged$$ = () => {}
      } else {
        logb.push(objstr.substring(0, 22)) + '...'
      }
    }

    if (data.actdef) {
      logb.push(data.actdef.id)
    }

    if (data.notice) {
      logb.push(data.notice)
    }

    if (data.data) {
      logb.push(data.data)
    }

    if ('ERR' === data.case && data.err && !data.err.$$logged$$) {
      logb.push(
        (data.err.code ? '\n\n' + data.err.code : '') +
          '\n\n' +
          data.err.stack +
          '\n' +
          data.caller +
          '\n'
      )
      data.err.$$logged$$ = () => {}
    }
  } else if ('add' === data.kind) {
    logb.push(data.pattern)
    logb.push(data.name)
  } else if ('ready' === data.kind) {
    logb.push(data.name)
  } else if ('plugin' === data.kind) {
    logb.push(data.plugin_name + (data.plugin_tag ? '$' + data.plugin_tag : ''))
  } else if ('options' === data.kind) {
    // deliberately omit
  } else if ('notice' === data.kind) {
    logb.push(data.notice)
  } else if ('fatal' === data.kind) {
    logb.push(data.notice)
    logb.push(data.err && data.err.stack)
  } else if ('listen' === data.kind || 'client' === data.kind) {
    var config =
      (data.options ? data.options[0] : data.data ? data.data[0] : {}) || {}
    logb.push(
      [
        config.type,
        config.pin,
        config.host,
        'function' === typeof config.port ? '' : config.port,
      ].join(';')
    )
  } else if (!data.$$logged$$) {
    logb.push(Util.inspect(data).replace(/\n/g, ' ').substring(0, datalen))
    data.$$logged$$ = () => {}
  }

  if (data.did) {
    logb.push(data.did)
  }

  logstr = logb.join('\t')

  return logstr
}

var intern = (module.exports.intern = {
  build_act_entry: function (act, entry) {
    entry.kind = entry.kind || 'act'
    entry.actid = entry.actid || act.meta.id
    entry.pattern = entry.pattern || act.meta.pattern
    entry.action = entry.action || act.def.id

    entry.idpath = ('' + act.meta.tx).substring(0, 5)
    if (act.meta.parents) {
      for (var i = 0; i < act.meta.parents.length; i++) {
        entry.idpath += (
          '.' + ((act.meta.parents[i] || [])[1] || '-').split('/')[0]
        ).substring(0, 6)
      }
    }
    entry.idpath += ('.' + act.meta.mi).substring(0, 6)
  },
})
