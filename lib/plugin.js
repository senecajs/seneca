/* Copyright © 2020-2023 Richard Rodger and other contributors, MIT License. */
/* $lab:coverage:off$ */
'use strict';
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Plugin = void 0;
// TODO: replace `seneca-` prefix with `plugin-` for unnamed plugins
const Uniq = require('lodash.uniq');
const Eraro = require('eraro');
const nua_1 = __importDefault(require("nua"));
const ordu_1 = require("ordu");
// TODO: refactor: use.js->plugin.js and contain *_plugin api methods too
const Common = require('./common');
const { Print } = require('./print');
/* $lab:coverage:on$ */
const intern = make_intern();
function api_use(callpoint, opts) {
    const tasks = make_tasks();
    const ordu = new ordu_1.Ordu({ debug: opts.debug });
    ordu.operator('seneca_plugin', intern.op.seneca_plugin);
    ordu.operator('seneca_export', intern.op.seneca_export);
    ordu.operator('seneca_options', intern.op.seneca_options);
    ordu.operator('seneca_complete', intern.op.seneca_complete);
    // TODO: restructure in seneca 4.x
    ordu.add([
        tasks.args,
        tasks.load,
        tasks.normalize,
        {
            name: 'pre_options', exec: (spec) => {
                if ('function' === typeof spec.data.plugin.define.preload) {
                    return tasks.options(spec);
                }
            }
        },
        tasks.preload,
        { name: 'pre_meta', exec: tasks.meta },
        { name: 'pre_legacy_extend', exec: tasks.legacy_extend },
        tasks.delegate,
        tasks.call_define,
        tasks.options,
        tasks.define,
        { name: 'post_meta', exec: tasks.meta },
        { name: 'post_legacy_extend', exec: tasks.legacy_extend },
        tasks.call_prepare,
        tasks.complete,
    ]);
    return {
        use: make_use(ordu, callpoint),
        ordu,
        tasks,
    };
}
function make_use(ordu, callpoint) {
    let seq = { index: 0 };
    return function use() {
        let self = this;
        let args = [...arguments];
        if (0 === args.length) {
            throw self.error('use_no_args');
        }
        let ctx = {
            seq: seq,
            args: args,
            seneca: this,
            callpoint: callpoint(true)
        };
        let data = {
            seq: -1,
            args: [],
            plugin: null,
            meta: null,
            delegate: null,
            plugin_done: null,
            exports: {},
            prepare: {},
        };
        async function run() {
            await ordu.exec(ctx, data, {
                done: function (res) {
                    if (res.err) {
                        var err = res.err.seneca ? res.err :
                            self.private$.error(res.err, res.err.code);
                        err.plugin = err.plugin ||
                            (data.plugin ? (data.plugin.fullname || data.plugin.name) :
                                args.join(' '));
                        err.plugin_callpoint = err.plugin_callpoint || ctx.callpoint;
                        self.die(err);
                    }
                }
            });
        }
        // NOTE: don't wait for result!
        run();
        return self;
    };
}
function make_tasks() {
    return {
        // TODO: args validation?
        args: (spec) => {
            let args = [...spec.ctx.args];
            // DEPRECATED: Remove when Seneca >= 4.x
            // Allow chaining with seneca.use('options', {...})
            // see https://github.com/rjrodger/seneca/issues/80
            if ('options' === args[0]) {
                spec.ctx.seneca.options(args[1]);
                return {
                    op: 'stop',
                    why: 'legacy-options'
                };
            }
            // Plugin definition function is under property `define`.
            // `init` is deprecated from 4.x
            // TODO: use-plugin expects `init` - update use-plugin to make this customizable
            if (null != args[0] && 'object' === typeof args[0]) {
                args[0].init = args[0].define || args[0].init;
            }
            return {
                op: 'merge',
                out: { plugin: { args } }
            };
        },
        load: (spec) => {
            let args = spec.data.plugin.args;
            let seneca = spec.ctx.seneca;
            let private$ = seneca.private$;
            // Special cases for short plugin names
            // TODO: plugin loading should check for @seneca and seneca first!
            // 1. Avoid conflict with the OG request module!
            if ('request' === args[0]) {
                args[0] = '@seneca/request';
            }
            // TODO: use-plugin needs better error message for malformed plugin desc
            let desc = private$.use.build_plugin_desc(...args);
            desc.callpoint = spec.ctx.callpoint;
            if (private$.ignore_plugins[desc.full]) {
                seneca.log.info({
                    kind: 'plugin',
                    case: 'ignore',
                    plugin_full: desc.full,
                    plugin_name: desc.name,
                    plugin_tag: desc.tag,
                });
                return {
                    op: 'stop',
                    why: 'ignore'
                };
            }
            else {
                let plugin = private$.use.use_plugin_desc(desc);
                return {
                    op: 'merge',
                    out: {
                        plugin
                    }
                };
            }
        },
        normalize: (spec) => {
            let plugin = spec.data.plugin;
            let modify = {};
            // NOTE: `define` is the property for the plugin definition action.
            // The property `init` will be deprecated in 4.x
            modify.define = plugin.define || plugin.init;
            modify.fullname = Common.make_plugin_key(plugin);
            modify.loading = true;
            return {
                op: 'merge',
                out: { plugin: modify }
            };
        },
        preload: (spec) => {
            let seneca = spec.ctx.seneca;
            let plugin = spec.data.plugin;
            let so = seneca.options();
            // Don't reload plugins if load_once true.
            if (so.system.plugin.load_once) {
                if (seneca.has_plugin(plugin)) {
                    return {
                        op: 'stop',
                        why: 'already-loaded',
                        out: {
                            plugin: {
                                loading: false
                            }
                        }
                    };
                }
            }
            let meta = {};
            if ('function' === typeof plugin.define.preload) {
                // TODO: need to capture errors
                meta = plugin.define.preload.call(seneca, plugin) || {};
            }
            let name = meta.name || plugin.name;
            let fullname = Common.make_plugin_key(name, plugin.tag);
            return {
                op: 'seneca_plugin',
                out: {
                    merge: {
                        meta,
                        plugin: {
                            name,
                            fullname
                        }
                    },
                    plugin
                }
            };
        },
        // Handle plugin meta data returned by plugin define function
        meta: (spec) => {
            let seneca = spec.ctx.seneca;
            let plugin = spec.data.plugin;
            let meta = spec.data.meta;
            let exports = {};
            exports[plugin.name] = meta.export || plugin;
            exports[plugin.fullname] = meta.export || plugin;
            let exportmap = meta.exportmap || meta.exports || {};
            Object.keys(exportmap).forEach(k => {
                let v = exportmap[k];
                if (void 0 !== v) {
                    let exportfullname = plugin.fullname + '/' + k;
                    exports[exportfullname] = v;
                    // Also provide exports on untagged plugin name. This is the
                    // standard name that other plugins use
                    let exportname = plugin.name + '/' + k;
                    exports[exportname] = v;
                }
            });
            if (meta.order) {
                if (meta.order.plugin) {
                    let tasks = Array.isArray(meta.order.plugin) ? meta.order.plugin :
                        [meta.order.plugin];
                    seneca.order.plugin.add(tasks);
                    delete meta.order.plugin;
                }
            }
            return {
                op: 'seneca_export',
                out: {
                    exports
                }
            };
        },
        // NOTE: mutates spec.ctx.seneca
        legacy_extend: (spec) => {
            let seneca = spec.ctx.seneca;
            // let plugin: any = spec.data.plugin
            let meta = spec.data.meta;
            if (meta.extend && 'object' === typeof meta.extend) {
                if ('function' === typeof meta.extend.action_modifier) {
                    seneca.private$.action_modifiers.push(meta.extend.action_modifier);
                }
                // FIX: needs to use logging.load_logger
                if ('function' === typeof meta.extend.logger) {
                    if (!meta.extend.logger.replace &&
                        'function' === typeof seneca.private$.logger.add) {
                        seneca.private$.logger.add(meta.extend.logger);
                    }
                    else {
                        seneca.private$.logger = meta.extend.logger;
                    }
                }
            }
        },
        delegate: (spec) => {
            let seneca = spec.ctx.seneca;
            let plugin = spec.data.plugin;
            // Adjust Seneca API to be plugin specific.
            let delegate = seneca.delegate({
                plugin$: {
                    name: plugin.name,
                    tag: plugin.tag,
                },
                fatal$: true,
            });
            // Shared plugin resources.
            plugin.shared = Object.create(null);
            delegate.shared = plugin.shared;
            delegate.plugin = plugin;
            delegate.private$ = Object.create(seneca.private$);
            delegate.private$.ge = delegate.private$.ge.gate();
            delegate.die = Common.makedie(delegate, {
                type: 'plugin',
                plugin: plugin.name,
            });
            let actdeflist = [];
            delegate.add = function plugin_add() {
                let argsarr = [...arguments];
                // TODO: this is very brittle.
                // Instead pass in plugin details using a directive.
                let actdef = argsarr[argsarr.length - 1] || {};
                if ('function' === typeof actdef) {
                    actdef = {};
                    argsarr.push(actdef);
                }
                if (null != actdef && 'object' === typeof actdef) {
                    actdef.plugin_name = plugin.name || '-';
                    actdef.plugin_tag = plugin.tag || '-';
                    actdef.plugin_fullname = plugin.fullname;
                    // TODO: is this necessary?
                    actdef.log = delegate.log;
                    actdeflist.push(actdef);
                }
                seneca.add.apply(delegate, argsarr);
                return this;
            };
            delegate.__update_plugin__ = function (plugin) {
                delegate.context.name = plugin.name || '-';
                delegate.context.tag = plugin.tag || '-';
                delegate.context.full = plugin.fullname || '-';
                actdeflist.forEach(function (actdef) {
                    actdef.plugin_name = plugin.name || actdef.plugin_name || '-';
                    actdef.plugin_tag = plugin.tag || actdef.plugin_tag || '-';
                    actdef.plugin_fullname = plugin.fullname || actdef.plugin_fullname || '-';
                });
            };
            delegate.init = function (init) {
                // TODO: validate init_action is function
                let pat = {
                    role: 'seneca',
                    plugin: 'init',
                    init: plugin.name,
                };
                if (null != plugin.tag && '-' != plugin.tag) {
                    pat.tag = plugin.tag;
                }
                delegate.add(pat, function (_, reply) {
                    init.call(this, reply);
                });
            };
            delegate.context.plugin = plugin;
            delegate.context.plugin.mark = Math.random();
            return {
                op: 'merge',
                out: {
                    delegate
                }
            };
        },
        call_define: (spec) => {
            let plugin = spec.data.plugin;
            let delegate = spec.data.delegate;
            // FIX: mutating context!!!
            let seq = spec.ctx.seq.index++;
            let plugin_define_pattern = {
                role: 'seneca',
                plugin: 'define',
                name: plugin.name,
                seq: seq,
            };
            if (plugin.tag !== null) {
                plugin_define_pattern.tag = plugin.tag;
            }
            return new Promise(resolve => {
                // seneca
                delegate.add(plugin_define_pattern, (_, reply) => {
                    resolve({
                        op: 'merge',
                        out: { seq, plugin_done: reply }
                    });
                });
                delegate.act({
                    role: 'seneca',
                    plugin: 'define',
                    name: plugin.name,
                    tag: plugin.tag,
                    seq: seq,
                    default$: {},
                    fatal$: true,
                    local$: true,
                });
            });
        },
        /*
        pre_options: (spec: TaskSpec) => {
          try {
            let plugin: any = spec.data.plugin
            // let delegate: any = spec.data.delegate
            let seneca = spec.ctx.seneca
    
            // let so = delegate.options()
            let so = seneca.options()
    
            let fullname = plugin.fullname
            let defaults = plugin.defaults
    
            let fullname_options = Object.assign(
              {},
    
              // DEPRECATED: remove in 4
              so.legacy.top_plugins ? so[fullname] : {},
    
              so.plugin[fullname],
    
              // DEPRECATED: remove in 4
              so.legacy.top_plugins ? so[fullname + '$' + plugin.tag] : {},
    
              so.plugin[fullname + '$' + plugin.tag]
            )
    
            let shortname = fullname !== plugin.name ? plugin.name : null
            if (!shortname && fullname.indexOf('seneca-') === 0) {
              shortname = fullname.substring('seneca-'.length)
            }
    
            let shortname_options = Object.assign(
              {},
    
              // DEPRECATED: remove in 4
              so.legacy.top_plugins ? so[fullname] : {},
    
              so.plugin[shortname],
    
              // DEPRECATED: remove in 4
              so.legacy.top_plugins ? so[shortname + '$' + plugin.tag] : {},
    
              so.plugin[shortname + '$' + plugin.tag]
            )
    
            let base: any = {}
    
            // NOTE: plugin error codes are in their own namespaces
            // TODO: test this!!!
            let errors = plugin.errors || (plugin.define && plugin.define.errors)
    
            if (errors) {
              base.errors = errors
            }
    
            // TODO: these should deep merge
            let fullopts = Object.assign(
              base,
              shortname_options,
              fullname_options,
              plugin.options || {}
            )
    
    
            let resolved_options: any = {}
            // let valid = delegate.valid // Gubu validator: https://github.com/rjrodger/gubu
            let valid = seneca.valid // Gubu validator: https://github.com/rjrodger/gubu
    
            let err: Error | undefined = void 0
            let joi_schema: any = null
            // let Joi = delegate.util.Joi
            let Joi = seneca.util.Joi
    
            let defaults_values =
              ('function' === typeof (defaults) && !defaults.gubu) ?
                defaults({ valid, Joi }) : defaults
    
            if (null == defaults_values ||
              0 === Object.keys(defaults_values).length ||
              !so.valid.active ||
              !so.valid.plugin
            ) {
              resolved_options = fullopts
            }
            else {
              if (!so.legacy.options && !Joi.isSchema(defaults_values, { legacy: true })) {
                // TODO: use Gubu.isShape
                let isShape = defaults_values.gubu && defaults_values.gubu.gubu$
    
                // TODO: when Gubu supports merge, also merge if isShape
                if (!isShape && null == defaults_values.errors && null != errors) {
                  defaults_values.errors = {}
                }
    
                let optionShape =
                  // isShape ? defaults_values : delegate.valid(defaults_values)
                  isShape ? defaults_values : seneca.valid(defaults_values)
                let shapeErrors: any[] = []
                resolved_options = optionShape(fullopts, { err: shapeErrors })
    
                if (0 < shapeErrors.length) {
                  //err = delegate.error('invalid_plugin_option', {
                  err = seneca.error('invalid_plugin_option', {
                    name: fullname,
                    err_msg: shapeErrors.map((se: any) => se.t).join('; '),
                    options: fullopts,
                  })
                }
              }
              else {
                let joi_schema: any = intern.prepare_spec(
                  Joi,
                  defaults_values,
                  { allow_unknown: true },
                  {}
                )
    
                let joi_out = joi_schema.validate(fullopts)
    
                if (joi_out.error) {
                  // err = delegate.error('invalid_plugin_option', {
                  err = seneca.error('invalid_plugin_option', {
                    name: fullname,
                    err_msg: joi_out.error.message,
                    options: fullopts,
                  })
                }
                else {
                  resolved_options = joi_out.value
                }
              }
            }
    
            return {
              op: 'seneca_options',
              err: err,
              out: {
                plugin: {
                  options: resolved_options,
                  options_schema: joi_schema
                }
              }
            }
          } catch (e: any) {
            console.log('PREOPTS', e)
          }
        },
        */
        options: (spec) => {
            let plugin = spec.data.plugin;
            let delegate = spec.data.delegate ||
                spec.ctx.seneca; // for preload
            let so = delegate.options();
            let fullname = plugin.fullname;
            let defaults = plugin.defaults;
            let fullname_options = Object.assign({}, so.plugin[fullname], so.plugin[fullname + '$' + plugin.tag]);
            let shortname = fullname !== plugin.name ? plugin.name : null;
            if (!shortname && fullname.indexOf('seneca-') === 0) {
                shortname = fullname.substring('seneca-'.length);
            }
            let shortname_options = Object.assign({}, so.plugin[shortname], so.plugin[shortname + '$' + plugin.tag]);
            let base = {};
            // NOTE: plugin error codes are in their own namespaces
            // TODO: test this!!!
            let errors = plugin.errors || (plugin.define && plugin.define.errors);
            if (errors) {
                base.errors = errors;
            }
            // TODO: these should deep merge
            let fullopts = Object.assign(base, shortname_options, fullname_options, plugin.options || {});
            let resolved_options = {};
            let valid = delegate.valid; // Gubu validator: https://github.com/rjrodger/gubu
            let err = void 0;
            let joi_schema = null;
            let Joi = delegate.util.Joi;
            let defaults_values = ('function' === typeof (defaults) && !defaults.gubu) ?
                defaults({ valid, Joi }) : defaults;
            if (null == defaults_values ||
                0 === Object.keys(defaults_values).length ||
                !so.valid.active ||
                !so.valid.plugin) {
                resolved_options = fullopts;
            }
            else {
                if (!so.legacy.options &&
                    !defaults_values.$_root // check for legacy Joi schema
                ) { // !Joi.isSchema(defaults_values, { legacy: true })) {
                    // TODO: use Gubu.isShape
                    let isShape = defaults_values.gubu && defaults_values.gubu.gubu$;
                    // TODO: when Gubu supports merge, also merge if isShape
                    if (!isShape && null == defaults_values.errors && null != errors) {
                        defaults_values.errors = {};
                    }
                    let optionShape = isShape ? defaults_values : delegate.valid(defaults_values);
                    let shapeErrors = [];
                    resolved_options = optionShape(fullopts, { err: shapeErrors });
                    if (0 < shapeErrors.length) {
                        err = delegate.error('invalid_plugin_option', {
                            name: fullname,
                            err_msg: shapeErrors.map((se) => se.t).join('; '),
                            options: fullopts,
                        });
                    }
                }
                else {
                    resolved_options = delegate.util.deep(defaults_values, fullopts);
                    /* TODO: move to seneca-joi
                    let joi_schema: any = intern.prepare_spec(
                      Joi,
                      defaults_values,
                      { allow_unknown: true },
                      {}
                    )
          
                    let joi_out = joi_schema.validate(fullopts)
          
                    if (joi_out.error) {
                      err = delegate.error('invalid_plugin_option', {
                        name: fullname,
                        err_msg: joi_out.error.message,
                        options: fullopts,
                      })
                    }
                    else {
                      resolved_options = joi_out.value
                    }
                    */
                }
            }
            return {
                op: 'seneca_options',
                err: err,
                out: {
                    plugin: {
                        options: resolved_options,
                        options_schema: joi_schema
                    }
                }
            };
        },
        // TODO: move data modification to returned operation
        define: (spec) => {
            let seneca = spec.ctx.seneca;
            let plugin = spec.data.plugin;
            let delegate = spec.data.delegate;
            let plugin_options = spec.data.plugin.options;
            delegate.log.debug({
                kind: 'plugin',
                case: 'DEFINE',
                name: plugin.name,
                tag: plugin.tag,
                options: plugin_options,
                callpoint: spec.ctx.callpoint,
            });
            let meta;
            meta = intern.define_plugin(delegate, plugin, seneca.util.clean(plugin_options));
            if (meta instanceof Promise) {
                return meta.then(finalize_meta);
            }
            return finalize_meta(meta);
            function finalize_meta(meta) {
                plugin.meta = meta;
                // legacy api for service function
                if ('function' === typeof meta) {
                    meta = { service: meta };
                }
                // Plugin may have changed its own name dynamically
                plugin.name = meta.name || plugin.name;
                plugin.tag =
                    meta.tag || plugin.tag || (plugin.options && plugin.options.tag$);
                plugin.fullname = Common.make_plugin_key(plugin);
                plugin.service = meta.service || plugin.service;
                delegate.__update_plugin__(plugin);
                seneca.private$.plugins[plugin.fullname] = plugin;
                seneca.private$.plugin_order.byname.push(plugin.name);
                seneca.private$.plugin_order.byname = Uniq(seneca.private$.plugin_order.byname);
                seneca.private$.plugin_order.byref.push(plugin.fullname);
                // 3.x Backwards compatibility - REMOVE in 4.x
                if ('amqp-transport' === plugin.name) {
                    seneca.options({ legacy: { meta: true } });
                }
                if ('function' === typeof plugin_options.defined$) {
                    plugin_options.defined$(plugin);
                }
                // TODO: test this, with preload, explicitly
                return {
                    op: 'merge',
                    out: {
                        meta,
                    }
                };
            }
        },
        call_prepare: (spec) => {
            let plugin = spec.data.plugin;
            let plugin_options = spec.data.plugin.options;
            let delegate = spec.data.delegate;
            // If init$ option false, do not execute init action.
            if (false === plugin_options.init$) {
                return;
            }
            let exports = spec.data.exports;
            delegate.log.debug({
                kind: 'plugin',
                case: 'INIT',
                name: plugin.name,
                tag: plugin.tag,
                exports: exports,
            });
            return new Promise(resolve => {
                delegate.act({
                    role: 'seneca',
                    plugin: 'init',
                    seq: spec.data.seq,
                    init: plugin.name,
                    tag: plugin.tag,
                    default$: {},
                    fatal$: true,
                    local$: true,
                }, function (err, res) {
                    resolve({
                        op: 'merge',
                        out: {
                            prepare: {
                                err,
                                res
                            }
                        }
                    });
                });
            });
        },
        complete: (spec) => {
            let prepare = spec.data.prepare;
            let plugin = spec.data.plugin;
            let plugin_done = spec.data.plugin_done;
            let plugin_options = spec.data.plugin.options;
            let delegate = spec.data.delegate;
            let so = delegate.options();
            if (prepare) {
                if (prepare.err) {
                    let plugin_out = {};
                    plugin_out.err_code = 'plugin_init';
                    plugin_out.plugin_error = prepare.err.message;
                    if (prepare.err.code === 'action-timeout') {
                        plugin_out.err_code = 'plugin_init_timeout';
                        plugin_out.timeout = so.timeout;
                    }
                    return {
                        op: 'seneca_complete',
                        out: {
                            plugin: plugin_out
                        }
                    };
                }
                let fullname = plugin.name + (plugin.tag ? '$' + plugin.tag : '');
                if (so.debug.print && so.debug.print.options) {
                    Print.plugin_options(delegate, fullname, plugin_options);
                }
                delegate.log.info({
                    kind: 'plugin',
                    case: 'READY',
                    name: plugin.name,
                    tag: plugin.tag,
                });
                if ('function' === typeof plugin_options.inited$) {
                    plugin_options.inited$(plugin);
                }
            }
            plugin_done();
            return {
                op: 'seneca_complete',
                out: {
                    plugin: {
                        loading: false
                    }
                }
            };
        }
    };
}
function make_intern() {
    return {
        // TODO: explicit tests for these operators
        op: {
            seneca_plugin: (tr, ctx, data) => {
                (0, nua_1.default)(data, tr.out.merge, { preserve: true });
                ctx.seneca.private$.plugins[data.plugin.fullname] = tr.out.plugin;
                return { stop: false };
            },
            seneca_export: (tr, ctx, data) => {
                // NOTE/plugin/774a: when loading multiple tagged plugins,
                // last plugin wins the plugin name on the exports. This is
                // consistent with general Seneca principal that plugin load
                // order is significant, as later plugins override earlier
                // action patterns. Thus later plugins override exports too.
                Object.assign(data.exports, tr.out.exports);
                Object.assign(ctx.seneca.private$.exports, tr.out.exports);
                return { stop: false };
            },
            seneca_options: (tr, ctx, data) => {
                (0, nua_1.default)(data.plugin, tr.out.plugin, { preserve: true });
                let plugin_fullname = data.plugin.fullname;
                let plugin_options = data.plugin.options;
                let plugin_options_update = { plugin: {} };
                plugin_options_update.plugin[plugin_fullname] = plugin_options;
                ctx.seneca.options(plugin_options_update);
                return { stop: false };
            },
            seneca_complete: (tr, _ctx, data) => {
                (0, nua_1.default)(data.plugin, tr.out.plugin, { preserve: true });
                if (data.prepare.err) {
                    data.delegate.die(data.delegate.error(data.prepare.err, data.plugin.err_code, data.plugin));
                }
                return { stop: true };
            },
        },
        define_plugin: function (delegate, plugin, options) {
            // legacy plugins
            if (plugin.define.length > 1) {
                let fnstr = plugin.define.toString();
                plugin.init_func_sig = (fnstr.match(/^(.*)\r*\n/) || [])[1];
                let ex = delegate.error('unsupported_legacy_plugin', plugin);
                throw ex;
            }
            if (options.errors) {
                plugin.eraro = Eraro({
                    package: 'seneca',
                    msgmap: options.errors,
                    override: true,
                });
            }
            let meta;
            try {
                meta = plugin.define.call(delegate, options) || {};
            }
            catch (e) {
                Common.wrap_error(e, 'plugin_define_failed', {
                    fullname: plugin.fullname,
                    message: (e.message + (' (' + e.stack.match(/\n.*?\n/)).replace(/\n.*\//g, '')).replace(/\n/g, ''),
                    options: options,
                    repo: plugin.repo ? ' ' + plugin.repo + '/issues' : '',
                });
            }
            if (meta instanceof Promise) {
                return meta.then(finalize_meta);
            }
            return finalize_meta(meta);
            function finalize_meta(base_meta) {
                const meta = 'string' === typeof base_meta
                    ? { name: base_meta }
                    : base_meta;
                meta.options = meta.options || options;
                return meta;
            }
        },
        /* TODO: move to seneca-joi
        // copied from https://github.com/rjrodger/optioner
        // TODO: remove unnecessary vars+code
        prepare_spec: function(Joi: any, spec: any, opts: any, ctxt: any) {
          if (Joi.isSchema(spec, { legacy: true })) {
            return spec
          }
    
          let joiobj = Joi.object()
    
          if (opts.allow_unknown) {
            joiobj = joiobj.unknown()
          }
    
          let joi = intern.walk(
            Joi,
            joiobj,
            spec,
            '',
            opts,
            ctxt,
            function(valspec: any) {
              if (valspec && Joi.isSchema(valspec, { legacy: true })) {
                return valspec
              } else {
                let typecheck = typeof valspec
                //typecheck = 'function' === typecheck ? 'func' : typecheck
    
                if (opts.must_match_literals) {
                  return Joi.any()
                    .required()
                    .valid(valspec)
                } else {
                  if (void 0 === valspec) {
                    return Joi.any().optional()
                  } else if (null == valspec) {
                    return Joi.any().default(null)
                  } else if ('number' === typecheck && Number.isInteger(valspec)) {
                    return Joi.number()
                      .integer()
                      .default(valspec)
                  } else if ('string' === typecheck) {
                    return Joi.string()
                      .empty('')
                      .default(() => valspec)
                  } else {
                    return Joi[typecheck]().default(() => valspec)
                  }
                }
              }
            })
    
          return joi
        },
    
    
        // copied from https://github.com/rjrodger/optioner
        // TODO: remove unnecessary vars+code
        walk: function(
          Joi: any,
          start_joiobj: any,
          obj: any,
          path: any,
          opts: any,
          ctxt: any,
          mod: any) {
    
          let joiobj = start_joiobj
    
          // NOTE: use explicit Joi construction for checking within arrays
          if (Array.isArray(obj)) {
            return Joi.array().default(obj)
          }
          else {
            for (let p in obj) {
              let v = obj[p]
              let t = typeof v
    
              let kv: any = {}
    
              if (null != v && !Joi.isSchema(v, { legacy: true }) && 'object' === t) {
                let np = '' === path ? p : path + '.' + p
    
                let childjoiobj = Joi.object().default()
    
                if (opts.allow_unknown) {
                  childjoiobj = childjoiobj.unknown()
                }
    
                kv[p] = intern.walk(Joi, childjoiobj, v, np, opts, ctxt, mod)
              } else {
                kv[p] = mod(v)
              }
    
              joiobj = joiobj.keys(kv)
            }
    
            return joiobj
          }
        }
        */
    };
}
const Plugin = {
    api_use,
    intern,
};
exports.Plugin = Plugin;
//# sourceMappingURL=plugin.js.map