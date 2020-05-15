/* Copyright © 2020 Richard Rodger and other contributors, MIT License. */
'use strict';
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const Uniq = require('lodash.uniq');
const Eraro = require('eraro');
const nua_1 = __importDefault(require("nua"));
const ordu_1 = require("ordu");
// TODO: refactor: use.js->plugin.js and contain *_plugin api methods too
const Common = require('./common');
const Print = require('./print');
exports.api_use = api_use;
function api_use(callpoint) {
    const tasks = make_tasks();
    const ordu = new ordu_1.Ordu({ debug: true });
    ordu.operator('seneca_plugin', tasks.op.seneca_plugin);
    ordu.operator('seneca_export', tasks.op.seneca_export);
    ordu.add([
        tasks.args,
        tasks.load,
        tasks.normalize,
        tasks.preload,
        { name: 'pre_exports', exec: tasks.exports },
        { name: 'pre_legacy_extend', exec: tasks.legacy_extend },
        tasks.delegate,
        //intern.options,
        tasks.call_define,
        tasks.define,
        { name: 'post_exports', exec: tasks.exports },
        { name: 'post_legacy_extend', exec: tasks.legacy_extend },
        function complete() {
            //console.log('COMPLETE')
        },
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
        var self = this;
        let ctx = {
            seq: seq,
            args: [...arguments],
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
            exports: {}
        };
        async function run() {
            // NOTE: don't wait for result!
            //var resp =
            await ordu.exec(ctx, data, {
                done: function (res) {
                    //console.log('RES-ERR', res.err)
                    if (res.err) {
                        //self.die(self.private$.error(res.err, 'plugin_' + res.err.code))
                        var err = res.err.seneca ? res.err :
                            self.private$.error(res.err, res.err.code);
                        self.die(err);
                    }
                }
            });
            //console.log('RESP')
            //console.dir((resp.tasklog as any[]).map((x): any => [x.name, x.op, x.result.err]), { depth: null })
        }
        run();
        return self;
    };
}
function make_tasks() {
    return {
        op: {
            seneca_plugin: (tr, ctx, data) => {
                nua_1.default(data, tr.out.merge, { preserve: true });
                ctx.seneca.private$.plugins[data.plugin.fullname] = tr.out.plugin;
                return { stop: false };
            },
            // TODO: explicit test for exports needed
            seneca_export: (tr, ctx, data) => {
                Object.assign(data.exports, tr.out.exports);
                Object.assign(ctx.seneca.private$.exports, tr.out.exports);
                return { stop: false };
            }
        },
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
                out: { args }
            };
        },
        load: (spec) => {
            let args = spec.data.args;
            let seneca = spec.ctx.seneca;
            let private$ = seneca.private$;
            // TODO: use-plugin needs better error message for malformed plugin desc
            var desc = private$.use.build_plugin_desc(...args);
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
                    out: { plugin }
                };
            }
        },
        normalize: (spec) => {
            let plugin = spec.data.plugin;
            var modify = {};
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
        exports: (spec) => {
            let plugin = spec.data.plugin;
            let meta = spec.data.meta;
            let exports = {};
            exports[plugin.name] = meta.export || plugin;
            exports[plugin.fullname] = meta.export || plugin;
            let exportmap = meta.exportmap || meta.exports || {};
            Object.keys(exportmap).forEach(k => {
                let v = exportmap[k];
                if (void 0 !== v) {
                    let exportname = plugin.fullname + '/' + k;
                    exports[exportname] = v;
                }
            });
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
            if ('object' === typeof meta.extend) {
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
            //seneca.register(plugin, meta)
        },
        delegate: (spec) => {
            let seneca = spec.ctx.seneca;
            let plugin = spec.data.plugin;
            var delegate = make_delegate(seneca, plugin);
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
            var seq = spec.ctx.seq.index++;
            var plugin_define_pattern = {
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
        define: (spec) => {
            let seneca = spec.ctx.seneca;
            let so = seneca.options();
            let plugin = spec.data.plugin;
            let plugin_done = spec.data.plugin_done;
            //return new Promise((resolve) => {
            var plugin_seneca = spec.data.delegate;
            var plugin_options = resolve_options(plugin.fullname, plugin, seneca);
            // Update stored plugin options (NOTE . != _ !!!)
            plugin.options = { ...plugin.options, ...plugin_options };
            plugin.mark2 = Math.random();
            // Update plugin options data in Seneca options.
            var seneca_options = { plugin: {} };
            seneca_options.plugin[plugin.fullname] = plugin.options;
            seneca.options(seneca_options);
            plugin_seneca.log.debug({
                kind: 'plugin',
                case: 'DEFINE',
                name: plugin.name,
                tag: plugin.tag,
                options: plugin_options,
                callpoint: spec.ctx.callpoint,
            });
            var meta = define_plugin(plugin_seneca, plugin, seneca.util.clean(plugin_options));
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
            plugin_seneca.__update_plugin__(plugin);
            seneca.private$.plugins[plugin.fullname] = plugin;
            seneca.private$.plugin_order.byname.push(plugin.name);
            seneca.private$.plugin_order.byname = Uniq(seneca.private$.plugin_order.byname);
            seneca.private$.plugin_order.byref.push(plugin.fullname);
            var exports = spec.data.exports;
            //console.log('EXPORTS', exports)
            //var exports = resolve_plugin_exports(plugin_seneca, plugin.fullname, meta)
            // 3.x Backwards compatibility - REMOVE in 4.x
            if ('amqp-transport' === plugin.name) {
                seneca.options({ legacy: { meta: true } });
            }
            if ('function' === typeof plugin_options.defined$) {
                plugin_options.defined$(plugin);
            }
            // If init$ option false, do not execute init action.
            if (false === plugin_options.init$) {
                plugin_done();
                //return resolve()
            }
            plugin_seneca.log.debug({
                kind: 'plugin',
                case: 'INIT',
                name: plugin.name,
                tag: plugin.tag,
                exports: exports,
            });
            plugin_seneca.act({
                role: 'seneca',
                plugin: 'init',
                seq: spec.data.seq,
                init: plugin.name,
                tag: plugin.tag,
                default$: {},
                fatal$: true,
                local$: true,
            }, function (err) {
                //try {
                if (err) {
                    var plugin_err_code = 'plugin_init';
                    plugin.plugin_error = err.message;
                    if (err.code === 'action-timeout') {
                        plugin_err_code = 'plugin_init_timeout';
                        plugin.timeout = so.timeout;
                    }
                    return plugin_seneca.die(
                    //internals.error(err, plugin_err_code, plugin)
                    seneca.error(err, plugin_err_code, plugin));
                }
                var fullname = plugin.name + (plugin.tag ? '$' + plugin.tag : '');
                if (so.debug.print && so.debug.print.options) {
                    Print.plugin_options(seneca, fullname, plugin_options);
                }
                plugin_seneca.log.info({
                    kind: 'plugin',
                    case: 'READY',
                    name: plugin.name,
                    tag: plugin.tag,
                });
                if ('function' === typeof plugin_options.inited$) {
                    plugin_options.inited$(plugin);
                }
                plugin_done();
                //return resolve()
                //} catch (e) {
                //    console.log('QWE', e)
                //  }
            });
            // TODO: test this, with preload, explicitly
            return {
                op: 'merge',
                out: {
                    meta,
                }
            };
        },
    };
}
function resolve_options(fullname, plugindef, seneca) {
    var so = seneca.options();
    var defaults = plugindef.defaults || {};
    var fullname_options = Object.assign({}, 
    // DEPRECATED: remove in 4
    so[fullname], so.plugin[fullname], 
    // DEPRECATED: remove in 4
    so[fullname + '$' + plugindef.tag], so.plugin[fullname + '$' + plugindef.tag]);
    var shortname = fullname !== plugindef.name ? plugindef.name : null;
    if (!shortname && fullname.indexOf('seneca-') === 0) {
        shortname = fullname.substring('seneca-'.length);
    }
    var shortname_options = Object.assign({}, 
    // DEPRECATED: remove in 4
    so[shortname], so.plugin[shortname], 
    // DEPRECATED: remove in 4
    so[shortname + '$' + plugindef.tag], so.plugin[shortname + '$' + plugindef.tag]);
    var base = {};
    // NOTE: plugin error codes are in their own namespaces
    var errors = plugindef.errors || (plugindef.define && plugindef.define.errors);
    if (errors) {
        base.errors = errors;
    }
    var outopts = Object.assign(base, shortname_options, fullname_options, plugindef.options || {});
    try {
        return seneca.util
            .Optioner(defaults, { allow_unknown: true })
            .check(outopts);
    }
    catch (e) {
        throw Common.error('invalid_plugin_option', {
            name: fullname,
            err_msg: e.message,
            options: outopts,
        });
    }
}
function define_plugin(delegate, plugin, options) {
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
    var meta;
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
    meta = 'string' === typeof meta ? { name: meta } : meta;
    meta.options = meta.options || options;
    var updated_options = {};
    updated_options[plugin.fullname] = meta.options;
    delegate.options(updated_options);
    return meta;
}
function make_delegate(instance, plugin) {
    // Adjust Seneca API to be plugin specific.
    var delegate = instance.delegate({
        plugin$: {
            name: plugin.name,
            tag: plugin.tag,
        },
        fatal$: true,
    });
    delegate.private$ = Object.create(instance.private$);
    delegate.private$.ge = delegate.private$.ge.gate();
    delegate.die = Common.makedie(delegate, {
        type: 'plugin',
        plugin: plugin.name,
    });
    var actdeflist = [];
    delegate.add = function () {
        var argsarr = new Array(arguments.length);
        for (var l = 0; l < argsarr.length; ++l) {
            argsarr[l] = arguments[l];
        }
        var actdef = argsarr[argsarr.length - 1] || {};
        if ('function' === typeof actdef) {
            actdef = {};
            argsarr.push(actdef);
        }
        actdef.plugin_name = plugin.name || '-';
        actdef.plugin_tag = plugin.tag || '-';
        actdef.plugin_fullname = plugin.fullname;
        // TODO: is this necessary?
        actdef.log = delegate.log;
        actdeflist.push(actdef);
        instance.add.apply(delegate, argsarr);
        return delegate;
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
        var pat = {
            role: 'seneca',
            plugin: 'init',
            init: plugin.name,
        };
        if (null != plugin.tag && '-' != plugin.tag) {
            pat.tag = plugin.tag;
        }
        delegate.add(pat, function (msg, reply) {
            init.call(this, reply);
        });
    };
    delegate.context.plugin = plugin;
    delegate.context.plugin.mark = Math.random();
    return delegate;
}
//# sourceMappingURL=use.js.map