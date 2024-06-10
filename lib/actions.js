"use strict";
/* Copyright © 2014-2022 Richard Rodger and other contributors, MIT License. */
Object.defineProperty(exports, "__esModule", { value: true });
exports.addActions = void 0;
const legacy_1 = require("./legacy");
const Common = require('./common');
function addActions(instance) {
    instance.stats = make_action_seneca_stats(instance.private$);
    // Add builtin actions.
    instance
        .add({ role: 'seneca', cmd: 'ping' }, cmd_ping)
        .add({ role: 'seneca', cmd: 'stats' }, instance.stats)
        .add({ role: 'seneca', cmd: 'close' }, action_seneca_close)
        .add({ role: 'seneca', info: 'fatal' }, action_seneca_fatal)
        .add({ role: 'seneca', get: 'options' }, action_options_get);
    // Forward compatibility
    instance
        .translate('sys:seneca', 'role:seneca', ['-sys']);
    // Legacy builtin actions.
    // Remove in Seneca 4.x
    instance.add({ role: 'seneca', stats: true, deprecate$: true }, instance.stats);
    instance.add({ role: 'options', cmd: 'get', deprecate$: true }, action_options_get);
}
exports.addActions = addActions;
function cmd_ping(_msg, reply) {
    let ping = this.ping();
    reply(ping);
}
function action_seneca_fatal(_msg, reply) {
    reply();
}
function action_seneca_close(_msg, reply) {
    this.emit('close');
    reply();
}
function make_action_seneca_stats(private$) {
    return function action_seneca_stats(msg, reply) {
        msg = msg || {};
        var stats;
        // TODO: review - this is sort of breaking the "type" of the stats result
        if (private$.stats.actmap[msg.pattern]) {
            stats = private$.stats.actmap[msg.pattern];
            stats.time = private$.timestats.calculate(msg.pattern);
        }
        else {
            stats = Object.assign({}, private$.stats);
            stats.now = new Date();
            stats.uptime = stats.now - stats.start;
            stats.now = new Date(stats.now).toISOString();
            stats.start = new Date(stats.start).toISOString();
            var summary = null == msg.summary || Common.boolify(msg.summary);
            if (summary) {
                stats.actmap = void 0;
            }
            else {
                Object.keys(private$.stats.actmap).forEach((p) => {
                    private$.stats.actmap[p].time = private$.timestats.calculate(p);
                });
            }
        }
        if (reply) {
            reply(stats);
        }
        return stats;
    };
}
function action_options_get(msg, reply) {
    var options = this.options();
    var base = msg.base || null;
    var top = base ? options[base] || {} : options;
    var val = msg.key ? top[msg.key] : top;
    reply(legacy_1.Legacy.copydata(val));
}
//# sourceMappingURL=actions.js.map