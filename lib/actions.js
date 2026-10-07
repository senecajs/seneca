"use strict";
/* Copyright © 2014-2022 Richard Rodger and other contributors, MIT License. */
Object.defineProperty(exports, "__esModule", { value: true });
exports.addActions = addActions;
const legacy_1 = require("./legacy");
// Seneca 3.x pattern for close hooks (still used by plugins such as
// seneca-transport to release listeners when the instance closes).
const LEGACY_CLOSE_PATTERN = { role: 'seneca', cmd: 'close' };
function addActions(instance) {
    instance.stats = make_action_seneca_stats(instance.private$);
    // Add builtin actions.
    instance
        .add('sys:seneca,on:point', on_point)
        .add('sys:seneca,cmd:ping', cmd_ping)
        .add('sys:seneca,cmd:stats', instance.stats)
        .add('sys:seneca,cmd:close', action_seneca_close)
        .add('sys:seneca,info:fatal', action_seneca_fatal)
        .add('sys:seneca,get:options', action_options_get);
    if (instance.options().legacy.builtin_actions) {
        instance.add({ role: 'seneca', cmd: 'ping' }, cmd_ping);
        instance.add({ role: 'seneca', cmd: 'stats' }, instance.stats);
        instance.add({ role: 'seneca', cmd: 'close' }, action_seneca_close_legacy);
        instance.add({ role: 'seneca', info: 'fatal' }, action_seneca_fatal);
        instance.add({ role: 'seneca', get: 'options' }, action_options_get);
    }
}
function on_point(msg, reply) {
    reply();
}
function cmd_ping(_msg, reply) {
    let ping = this.ping();
    reply(ping);
}
function action_seneca_fatal(_msg, reply) {
    reply();
}
// Called by seneca.close(). Plugins extend this action using priors
// (see seneca.destroy). If any close hooks have been registered on the
// legacy 3.x pattern, call that pattern too, so that resources such as
// transport listeners are released.
function action_seneca_close(_msg, reply) {
    this.emit('close');
    // Exact match only. Unlike seneca.has, this does not fall back to a
    // catch-all action (such as a transport client), which would send the
    // close message elsewhere.
    const legacy_close = this.private$.actrouter.find(LEGACY_CLOSE_PATTERN, true);
    if (legacy_close) {
        return this.act(LEGACY_CLOSE_PATTERN, { closing$: true }, reply);
    }
    reply();
}
// Legacy alias (option legacy.builtin_actions). The close event is emitted
// by sys:seneca,cmd:close, which also calls this pattern, so do not emit
// it a second time here.
function action_seneca_close_legacy(_msg, reply) {
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
            var summary = null == msg.summary || true === msg.summary;
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