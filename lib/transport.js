"use strict";
/* Copyright © 2010-2022 Richard Rodger and other contributors, MIT License. */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Transport = void 0;
const util_1 = __importDefault(require("util"));
const Stringify = require('fast-safe-stringify');
const Jsonic = require('jsonic');
const common_1 = require("./common");
// NOTE: Only provides transport API, and utils for transport plugins.
// Not an actual transport.
const intern = {};
// Reply to an action that is waiting for a result.
// Used by transports to decouple sending messages from receiving responses.
function reply(spec) {
    var instance = this;
    var actctxt = null;
    if (spec && spec.meta) {
        actctxt = instance.private$.history.get(spec.meta.id);
        if (actctxt) {
            actctxt.reply(spec.err, spec.out, spec.meta);
        }
    }
    return !!actctxt;
}
// Listen for inbound messages.
function listen(callpoint) {
    return function api_listen(...argsarr) {
        var private$ = this.private$;
        var self = this;
        var done = argsarr[argsarr.length - 1];
        if (typeof done === 'function') {
            argsarr.pop();
        }
        else {
            done = () => { };
        }
        self.log.info({
            kind: 'listen',
            case: 'INIT',
            data: argsarr,
            callpoint: callpoint(true),
        });
        var opts = self.options().transport || {};
        var config = intern.resolve_config(intern.parse_config(argsarr), opts);
        self.act('role:transport,cmd:listen', { config: config, gate$: true }, function (err, result) {
            if (err) {
                return self.die(private$.error(err, 'transport_listen', config));
            }
            done(null, result);
            done = () => { };
        });
        return self;
    };
}
// Send outbound messages.
function client(callpoint) {
    return function api_client() {
        var private$ = this.private$;
        var argsarr = Array.prototype.slice.call(arguments);
        var self = this;
        self.log.info({
            kind: 'client',
            case: 'INIT',
            data: argsarr,
            callpoint: callpoint(true),
        });
        var legacy = self.options().legacy || {};
        var opts = self.options().transport || {};
        var raw_config = intern.parse_config(argsarr);
        // pg: pin group
        raw_config.pg = (0, common_1.pincanon)(raw_config.pin || raw_config.pins);
        var config = intern.resolve_config(raw_config, opts);
        config.id = config.id || (0, common_1.pattern)(raw_config);
        var pins = config.pins ||
            (Array.isArray(config.pin) ? config.pin : [config.pin || '']);
        pins = pins.map((pin) => {
            return 'string' === typeof pin ? Jsonic(pin) : pin;
        });
        //var sd = Plugins.make_delegate(self, {
        // TODO: review - this feels like a hack
        // perhaps we should instantiate a virtual plugin to represent the client?
        // ... but is this necessary at all?
        var task_res = self.order.plugin.task.delegate.exec({
            ctx: {
                seneca: self,
            },
            data: {
                plugin: {
                    // TODO: make this unique with a counter
                    name: 'seneca_internal_client',
                    tag: void 0,
                },
            },
        });
        var sd = task_res.out.delegate;
        var sendclient;
        var transport_client = function transport_client(msg, reply, meta) {
            if (legacy.meta) {
                meta = meta || msg.meta$;
            }
            // Undefined plugin init actions pass through here when
            // there's a catchall client, as they have local$:true
            if (meta.local) {
                this.prior(msg, reply);
            }
            else if (sendclient && sendclient.send) {
                if (legacy.meta) {
                    msg.meta$ = meta;
                }
                sendclient.send.call(this, msg, reply, meta);
            }
            else {
                this.log.error('no-transport-client', { config: config, msg: msg });
            }
        };
        transport_client.id = config.id;
        if (config.makehandle) {
            transport_client.handle = config.makehandle(config);
        }
        pins.forEach((pin) => {
            pin = Object.assign({}, pin);
            // Override local actions, including those more specific than
            // the client pattern
            if (config.override) {
                sd.wrap(sd.util.clean(pin), { client_pattern: sd.util.pattern(pin) }, transport_client);
            }
            pin.client$ = true;
            pin.strict$ = { add: true };
            sd.add(pin, transport_client);
        });
        // Create client.
        sd.act('role:transport,cmd:client', { config: config, gate$: true }, function (err, liveclient) {
            if (err) {
                return sd.die(private$.error(err, 'transport_client', config));
            }
            if (null == liveclient) {
                return sd.die(private$.error('transport_client_null', (0, common_1.clean)(config)));
            }
            sendclient = liveclient;
        });
        return self;
    };
}
function init(seneca) {
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
intern.parse_config = function (args) {
    var out = {};
    var config = args.filter((x) => null != x);
    var arglen = config.length;
    if (arglen === 1) {
        if (config[0] && 'object' === typeof config[0]) {
            out = Object.assign({}, config[0]);
        }
        else {
            out.port = parseInt(config[0], 10);
        }
    }
    else if (arglen === 2) {
        out.port = parseInt(config[0], 10);
        out.host = config[1];
    }
    else if (arglen === 3) {
        out.port = parseInt(config[0], 10);
        out.host = config[1];
        out.path = config[2];
    }
    return out;
};
intern.resolve_config = function (config, options) {
    var out = Object.assign({}, config);
    Object.keys(options).forEach((key) => {
        var value = options[key];
        if (value && 'object' === typeof value) {
            return;
        }
        out[key] = out[key] === void 0 ? value : out[key];
    });
    // Default transport is web
    out.type = out.type || 'web';
    // DEPRECATED: Remove in 4.0
    if (out.type === 'direct' || out.type === 'http') {
        out.type = 'web';
    }
    var base = options[out.type] || {};
    out = Object.assign({}, base, out);
    if (out.type === 'web' || out.type === 'tcp') {
        out.port = out.port == null ? base.port : out.port;
        out.host = out.host == null ? base.host : out.host;
        out.path = out.path == null ? base.path : out.path;
    }
    return out;
};
function externalize_msg(seneca, msg, meta) {
    if (!msg)
        return;
    if (msg instanceof Error) {
        msg = intern.copydata(msg);
    }
    msg.meta$ = meta;
    return msg;
}
// TODO: handle arrays gracefully - e.g {arr$:[]} as msg
function externalize_reply(seneca, err, out, meta) {
    let rep = err || out;
    if (!rep) {
        rep = {};
        meta.empty = true;
    }
    rep.meta$ = meta;
    if (util_1.default.types.isNativeError(rep)) {
        rep = copydata(rep);
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
    msg.parents$.unshift(make_trace_desc(meta));
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
    return Stringify(obj);
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
function make_trace_desc(meta) {
    return [
        meta.pattern,
        meta.id,
        meta.instance,
        meta.tag,
        meta.version,
        meta.start,
        meta.end,
        meta.sync,
        meta.action,
    ];
}
function copydata(obj) {
    let copy;
    // Handle the 3 simple types, and null or undefined
    if (obj === null || typeof obj !== 'object')
        return obj;
    // Handle Error
    if (util_1.default.types.isNativeError(obj)) {
        copy = {};
        Object.getOwnPropertyNames(obj).forEach(function (key) {
            copy[key] = obj[key];
        });
        return copy;
    }
    // Handle Date
    if (obj.constructor && 'Date' === obj.constructor.name) {
        copy = new Date();
        copy.setTime(obj.getTime());
        return copy;
    }
    // Handle Array
    if (Array.isArray(obj)) {
        copy = [];
        for (var i = 0, len = obj.length; i < len; ++i) {
            copy[i] = copydata(obj[i]);
        }
        return copy;
    }
    copy = {};
    for (var attr in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, attr)) {
            copy[attr] = copydata(obj[attr]);
        }
    }
    return copy;
}
intern.internalize_msg = internalize_msg;
intern.internalize_reply = internalize_reply;
intern.externalize_msg = externalize_msg;
intern.externalize_reply = externalize_reply;
let Transport = {
    reply,
    listen,
    client,
    init,
    intern,
};
exports.Transport = Transport;
//# sourceMappingURL=transport.js.map