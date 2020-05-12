/* Copyright © 2020 Richard Rodger and other contributors, MIT License. */
'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
//import { make_plugin_key } from './common.js'
const ordu_1 = require("ordu");
// TODO: refactor: use.js->plugin.js and contain *_plugin api methods too
const Common = require('./common');
//import * as Common from './common.js'
exports.api_use = api_use;
function api_use(callpoint) {
    const exec = make_exec();
    const ordu = new ordu_1.Ordu();
    ordu.add(exec.args);
    ordu.add(exec.load);
    ordu.add(exec.normalize);
    ordu.add(exec.preload);
    ordu.add(exec.exports);
    ordu.add(exec['legacy.extend']);
    return {
        use: make_use(ordu, callpoint),
        ordu,
        exec,
    };
}
function make_use(ordu, callpoint) {
    return function use() {
        var self = this;
        let ctx = {
            args: [...arguments],
            seneca: this,
            callpoint: callpoint(true)
        };
        let data = {
            args: [],
            plugin: null,
            meta: null,
        };
        // NOTE: don't wait for result!
        ordu.exec(ctx, data, {
            done: function (res) {
                // console.log('RES', res)
                if (res.err) {
                    self.die(self.private$.error(res.err, 'plugin_' + res.err.code));
                }
            }
        });
        return self;
    };
}
function make_exec() {
    return {
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
            // TODO: how to handle this properly?
            seneca.private$.plugins[plugin.fullname] = plugin;
            let meta = {};
            if ('function' === typeof plugin.define.preload) {
                meta = plugin.define.preload.call(seneca, plugin) || {};
            }
            let name = meta.name || plugin.name;
            let fullname = Common.make_plugin_key(name, plugin.tag);
            return {
                op: 'merge',
                out: {
                    meta,
                    plugin: {
                        name,
                        fullname
                    }
                }
            };
        },
        exports: (spec) => {
            let seneca = spec.ctx.seneca;
            let plugin = spec.data.plugin;
            let meta = spec.data.meta;
            // TODO: how to handle this properly?
            seneca.private$.exports[plugin.name] = meta.export || plugin;
            seneca.private$.exports[plugin.fullname] = meta.export || plugin;
            let exportmap = meta.exportmap || meta.exports || {};
            Object.keys(exportmap).forEach(k => {
                let v = exportmap[k];
                if (void 0 !== v) {
                    let exportname = plugin.fullname + '/' + k;
                    seneca.private$.exports[exportname] = v;
                }
            });
        },
        'legacy.extend': (spec) => {
            let seneca = spec.ctx.seneca;
            let plugin = spec.data.plugin;
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
            seneca.register(plugin, meta);
        }
    };
}
//# sourceMappingURL=use.js.map