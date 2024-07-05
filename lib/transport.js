"use strict";
/* Copyright © 2015-2024 Richard Rodger and other contributors, MIT License. */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.transport = transport;
const util_1 = __importDefault(require("util"));
const common_1 = require("./common");
// THIS IS NOT A PLUGIN
// DO NOT COPY TO CREATE TRANSPORT PLUGINS
// USE THIS INSTEAD: [TODO github example]
// TODO: handle lists properly, without losing meta data
function transport(seneca) {
    seneca.add('role:transport,cmd:listen', action_listen);
    seneca.add('role:transport,cmd:client', action_client);
    const tu = {};
    tu.stringifyJSON = stringifyJSON;
    tu.parseJSON = parseJSON;
    tu.externalize_msg = externalize_msg;
    tu.externalize_reply = externalize_reply;
    tu.internalize_msg = internalize_msg;
    tu.internalize_reply = internalize_reply;
    tu.close = closeTransport;
    tu.info = function () {
        const pats = seneca.list();
        const acts = { local: {}, remote: {} };
        pats.forEach(function (pat) {
            const def = seneca.find(pat, { exact: true });
            if (def.client) {
                acts.remote[def.pattern] = def.id;
            }
            else {
                acts.local[def.pattern] = def.id;
            }
        });
        return acts;
    };
    seneca.private$.exports['transport/utils'] = tu;
}
function externalize_msg(_seneca, msg, meta) {
    if (!msg)
        return;
    if (msg instanceof Error || util_1.default.types.isNativeError(msg)) {
        msg = Object.getOwnPropertyNames(msg)
            .reduce((a, pn) => (a[pn] = msg[pn], a), {});
    }
    msg.meta$ = meta;
    return msg;
}
// TODO: handle arrays gracefully - e.g {arr$:[]} as msg
function externalize_reply(_seneca, err, out, meta) {
    let rep = err || out;
    if (!rep) {
        rep = {};
        meta.empty = true;
    }
    rep.meta$ = meta;
    if (rep instanceof Error || util_1.default.types.isNativeError(rep)) {
        rep = Object.getOwnPropertyNames(rep)
            .reduce((a, pn) => (a[pn] = rep[pn], a), {});
        rep.meta$.error = true;
    }
    return rep;
}
// TODO: allow list for inbound directives
function internalize_msg(seneca, msg) {
    if (!msg)
        return;
    msg = handle_entity(seneca, msg);
    const meta = msg.meta$ || {};
    delete msg.meta$;
    // You can't send fatal msgs
    delete msg.fatal$;
    msg.id$ = meta.id;
    msg.sync$ = meta.sync;
    msg.custom$ = meta.custom;
    msg.explain$ = meta.explain;
    msg.parents$ = meta.parents || [];
    msg.parents$.unshift((0, common_1.make_trace_desc)(meta));
    msg.remote$ = true;
    return msg;
}
function internalize_reply(seneca, data) {
    let meta = {};
    let err = null;
    let out = null;
    if (data) {
        meta = data.meta$;
        if (meta) {
            delete data.meta$;
            meta.remote = true;
            if (meta.error) {
                err = new Error(data.message);
                Object.assign(err, data);
            }
            else if (!meta.empty) {
                out = handle_entity(seneca, data);
            }
        }
    }
    return {
        err: err,
        out: out,
        meta: meta,
    };
}
function stringifyJSON(obj) {
    if (!obj)
        return;
    return (0, common_1.stringify)(obj);
}
function parseJSON(data) {
    if (!data)
        return;
    const str = data.toString();
    try {
        return JSON.parse(str);
    }
    catch (e) {
        e.input = str;
        return e;
    }
}
function handle_entity(seneca, msg) {
    if (seneca.make$) {
        if (msg.entity$) {
            msg = seneca.make$(msg);
        }
        Object.keys(msg).forEach(function (key) {
            const value = msg[key];
            if (value && 'object' === typeof value && value.entity$) {
                msg[key] = seneca.make$(value);
            }
        });
    }
    return msg;
}
function register(config, reply) {
    return function (err, out) {
        this.private$.transport.register.push({
            when: Date.now(),
            config: config,
            err: err,
            res: out,
        });
        reply(err, out);
    };
}
function closeTransport(seneca, closer) {
    seneca.add('role:seneca,cmd:close', function (msg, reply) {
        const seneca = this;
        closer.call(seneca, function (err) {
            if (err) {
                seneca.log.error(err);
            }
            seneca.prior(msg, reply);
        });
    });
}
function action_listen(msg, reply) {
    const seneca = this;
    const config = Object.assign({}, msg.config, {
        role: 'transport',
        hook: 'listen',
    });
    delete config.cmd;
    const listen_msg = seneca.util.clean(config);
    seneca.act(listen_msg, register(listen_msg, reply));
}
function action_client(msg, reply) {
    const seneca = this;
    const config = Object.assign({}, msg.config, {
        role: 'transport',
        hook: 'client',
    });
    delete config.cmd;
    const client_msg = seneca.util.clean(config);
    seneca.act(client_msg, register(client_msg, reply));
}
//# sourceMappingURL=transport.js.map