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
            preload: null,
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
            let preload = {};
            if ('function' === typeof plugin.define.preload) {
                preload.meta = plugin.define.preload.call(seneca, plugin);
            }
            preload.meta = preload.meta || {};
            preload.name = preload.meta.name || plugin.name;
            preload.fullname = Common.make_plugin_key(preload.name, plugin.tag);
            return {
                op: 'merge',
                out: {
                    preload
                }
            };
        },
        exports: (spec) => {
            let seneca = spec.ctx.seneca;
            let plugin = spec.data.plugin;
            let preload = spec.data.preload;
            seneca.private$.exports[preload.name] = preload.meta.export || plugin;
            seneca.register(plugin, preload);
        }
    };
}
//# sourceMappingURL=use.js.map