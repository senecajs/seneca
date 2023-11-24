/* Copyright © 2010-2022 Richard Rodger and other contributors, MIT License. */
'use strict';
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TRACE_ACTION = exports.TRACE_SYNC = exports.TRACE_END = exports.TRACE_START = exports.TRACE_VERSION = exports.TRACE_TAG = exports.TRACE_INSTANCE = exports.TRACE_ID = exports.TRACE_PATTERN = exports.jsonic_stringify = exports.msgstr = exports.error = exports.inspect = exports.tagnid = exports.print = exports.history = exports.make_trace_desc = exports.make_callpoint = exports.autoincr = exports.resolve_option = exports.make_standard_err_log_entry = exports.make_standard_act_log_entry = exports.makedie = exports.each = exports.deep = exports.clean = exports.noop = exports.pincanon = exports.pattern = exports.parse_jsonic = exports.make_plugin_key = exports.wrap_error = exports.stringify = exports.promiser = exports.pins = void 0;
const util_1 = __importDefault(require("util"));
const fast_safe_stringify_1 = __importDefault(require("fast-safe-stringify"));
const jsonic_next_1 = __importDefault(require("@jsonic/jsonic-next"));
const nid_1 = __importDefault(require("nid"));
const Eraro = require('eraro');
const DefaultsDeep = require('lodash.defaultsdeep');
const { Print } = require('./print');
const errors_1 = __importDefault(require("./errors"));
const error = (exports.error =
    exports.eraro =
        Eraro({
            package: 'seneca',
            msgmap: errors_1.default,
            override: true,
        }));
exports.error = error;
function pins(inpin) {
    return (Array.isArray(inpin) ? inpin : [inpin])
        .reduce((a, p) => (a.push('string' === typeof p ? p.split(';').map(pp => (0, jsonic_next_1.default)(pp)) : p), a), [])
        .filter((n) => null != n)
        .flat();
}
exports.pins = pins;
function promiser(context, callback) {
    if ('function' === typeof context && null == callback) {
        callback = context;
    }
    else {
        callback = callback.bind(context);
    }
    return new Promise((resolve, reject) => {
        callback((err, out) => {
            return err ? reject(err) : resolve(out);
        });
    });
}
exports.promiser = promiser;
function stringify() {
    return fast_safe_stringify_1.default(...arguments);
}
exports.stringify = stringify;
function wrap_error(err) {
    if (err.seneca) {
        throw err;
    }
    else {
        throw error.call(null, ...arguments);
    }
}
exports.wrap_error = wrap_error;
function make_plugin_key(plugin, origtag) {
    if (null == plugin) {
        throw error('missing_plugin_name');
    }
    let name = null == plugin.name ? plugin : plugin.name;
    let tag = null == plugin.tag ? (null == origtag ? '' : origtag) : plugin.tag;
    if ('number' === typeof name) {
        name = '' + name;
    }
    if ('number' === typeof tag) {
        tag = '' + tag;
    }
    if ('' == name || 'string' !== typeof name) {
        throw error('bad_plugin_name', { name: name });
    }
    let m = name.match(/^([a-zA-Z@][a-zA-Z0-9.~_\-/]*)\$([a-zA-Z0-9.~_-]+)$/);
    if (m) {
        name = m[1];
        tag = m[2];
    }
    // Allow file paths, but ...
    if (!name.match(/^(\.|\/|\\|\w:)/)) {
        // ... anything else should be well-formed
        if (!name.match(/^[a-zA-Z@][a-zA-Z0-9.~_\-/]*$/) || 1024 < name.length) {
            throw error('bad_plugin_name', { name: name });
        }
    }
    if ('' != tag && (!tag.match(/^[a-zA-Z0-9.~_-]+$/) || 1024 < tag.length)) {
        throw error('bad_plugin_tag', { tag: tag });
    }
    let key = name + (tag ? '$' + tag : '');
    return key;
}
exports.make_plugin_key = make_plugin_key;
const tagnid = (0, nid_1.default)({ length: 3, alphabet: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ' });
exports.tagnid = tagnid;
function parse_jsonic(str, code) {
    code = code || 'bad_jsonic';
    try {
        return null == str ? null : (0, jsonic_next_1.default)(str);
    }
    catch (e) {
        throw error(code, {
            argstr: str,
            syntax: e.message,
            line: e.lineNumber,
            col: e.columnNumber,
        });
    }
}
exports.parse_jsonic = parse_jsonic;
// Convert pattern object into a normalized jsonic String.
function pattern(patobj) {
    if ('string' === typeof patobj) {
        return patobj;
    }
    patobj = patobj || {};
    let sb = [];
    Object.keys(patobj).forEach((k) => {
        let v = patobj[k];
        if (!~k.indexOf('$') && 'function' != typeof v && 'object' != typeof v) {
            sb.push(k + ':' + v);
        }
    });
    sb.sort();
    return sb.join(',');
}
exports.pattern = pattern;
function pincanon(inpin) {
    if ('string' == typeof inpin) {
        return pattern((0, jsonic_next_1.default)(inpin));
    }
    else if (Array.isArray(inpin)) {
        let pin = inpin.map(pincanon);
        pin.sort();
        return pin.join(';');
    }
    else {
        return pattern(inpin);
    }
}
exports.pincanon = pincanon;
function noop() { }
exports.noop = noop;
// remove any props containing $
function clean(obj, opts) {
    if (null == obj)
        return obj;
    let out = Array.isArray(obj) ? [] : {};
    let pn = Object.getOwnPropertyNames(obj);
    for (let i = 0; i < pn.length; i++) {
        let p = pn[i];
        if ('$' != p[p.length - 1]) {
            out[p] = obj[p];
        }
    }
    return out;
}
exports.clean = clean;
// rightmost wins
function deep(...argsarr) {
    // Lodash uses the reverse order to apply defaults than the deep API.
    argsarr = argsarr.reverse();
    // Add an empty object to the front of the args.  Defaults will be written
    // to this empty object.
    argsarr.unshift({});
    return DefaultsDeep.apply(null, argsarr);
}
exports.deep = deep;
// Print action result
const print = Print.print;
exports.print = print;
// Iterate over arrays or objects
function each(collect, func) {
    if (null == collect || null == func) {
        return null;
    }
    if (Array.isArray(collect)) {
        return collect.forEach(func);
    }
    else {
        Object.keys(collect).forEach((k) => func(collect[k], k));
    }
}
exports.each = each;
function makedie(instance, ctxt) {
    ctxt = Object.assign(ctxt, instance.die ? instance.die.context : {});
    let diecount = 0;
    let die = function (err) {
        let so = instance.options();
        let test = so.test;
        // undead is only for testing, do not use in production
        let undead = (so.debug && so.debug.undead) || (err && err.undead);
        let full = (so.debug && so.debug.print && 'full' === so.debug.print.fatal) || false;
        let print_env = (so.debug && so.debug.print.env) || false;
        if (0 < diecount) {
            if (!undead) {
                throw error(err, '[DEATH LOOP] die count: ' + diecount);
            }
            return;
        }
        else {
            diecount++;
        }
        try {
            if (!err) {
                err = new Error('unknown');
            }
            else if (!so.error.identify(err)) {
                err = new Error('string' === typeof err ? err : inspect(err));
            }
            err.fatal$ = true;
            let logdesc = {
                kind: ctxt.txt || 'fatal',
                level: ctxt.level || 'fatal',
                plugin: ctxt.plugin,
                tag: ctxt.tag,
                id: ctxt.id,
                code: err.code || 'fatal',
                notice: err.message,
                err: err,
                callpoint: ctxt.callpoint && ctxt.callpoint(),
            };
            instance.log.fatal(logdesc);
            let stack = err.stack || '';
            stack = stack
                .substring(stack.indexOf('\n') + 5)
                .replace(/\n\s+/g, '\n               ');
            let procdesc = 'pid=' +
                process.pid +
                ', arch=' +
                process.arch +
                ', platform=' +
                process.platform +
                (!full ? '' : ', path=' + process.execPath) +
                ', argv=' +
                inspect(process.argv).replace(/\n/g, '') +
                (!full
                    ? ''
                    : !print_env
                        ? ''
                        : ', env=' + inspect(process.env).replace(/\n/g, ''));
            let when = new Date();
            let clean_details = null;
            let stderrmsg = '\n\n' +
                '=== SENECA FATAL ERROR ===' +
                '\nMESSAGE   :::  ' +
                err.message +
                '\nCODE      :::  ' +
                err.code +
                '\nINSTANCE  :::  ' +
                instance.toString() +
                '\nDETAILS   :::  ' +
                inspect(full
                    ? err.details
                    : ((clean_details = clean(err.details) || {}),
                        delete clean_details.instance,
                        clean_details), { depth: so.debug.print.depth }).replace(/\n/g, '\n               ') +
                '\nSTACK     :::  ' +
                stack +
                '\nWHEN      :::  ' +
                when.toISOString() +
                ', ' +
                when.getTime() +
                '\nLOG       :::  ' +
                jsonic_stringify(logdesc) +
                '\nNODE      :::  ' +
                process.version +
                ', ' +
                process.title +
                (!full
                    ? ''
                    : ', ' +
                        inspect(process.versions).replace(/\s+/g, ' ') +
                        ', ' +
                        inspect(process.features).replace(/\s+/g, ' ') +
                        ', ' +
                        inspect(process.moduleLoadList).replace(/\s+/g, ' ')) +
                '\nPROCESS   :::  ' +
                procdesc +
                '\nFOLDER    :::  ' +
                process.env.PWD;
            if (so.errhandler) {
                so.errhandler.call(instance, err);
            }
            if (instance.flags.closed) {
                return;
            }
            if (!undead) {
                instance.act('role:seneca,info:fatal,closing$:true', { err: err });
                instance.close(
                // terminate process, err (if defined) is from seneca.close
                function (close_err) {
                    if (!undead) {
                        process.nextTick(function () {
                            if (close_err) {
                                instance.log.fatal({
                                    kind: 'close',
                                    err: inspect(close_err),
                                });
                            }
                            if (test) {
                                if (close_err) {
                                    Print.internal_err(close_err);
                                }
                                Print.internal_err(stderrmsg);
                                Print.internal_err('\nSENECA TERMINATED at ' +
                                    new Date().toISOString() +
                                    '. See above for error report.\n');
                            }
                            so.system.exit(1);
                        });
                    }
                });
            }
            // make sure we close down within options.death_delay seconds
            if (!undead) {
                let killtimer = setTimeout(function () {
                    instance.log.fatal({ kind: 'close', timeout: true });
                    if (so.test) {
                        Print.internal_err(stderrmsg);
                        Print.internal_err('\n\nSENECA TERMINATED (on timeout) at ' +
                            new Date().toISOString() +
                            '.\n\n');
                    }
                    so.system.exit(2);
                }, so.death_delay);
                if (killtimer.unref) {
                    killtimer.unref();
                }
            }
        }
        catch (panic) {
            this.log.fatal({
                kind: 'panic',
                panic: inspect(panic),
                orig: arguments[0],
            });
            if (so.test) {
                let msg = '\n\n' +
                    'Seneca Panic\n' +
                    '============\n\n' +
                    panic.stack +
                    '\n\nOriginal Error:\n' +
                    (arguments[0] && arguments[0].stack
                        ? arguments[0].stack
                        : arguments[0]);
                Print.internal_err(msg);
            }
        }
    };
    die.context = ctxt;
    return die;
}
exports.makedie = makedie;
function make_standard_act_log_entry(actdef, msg, meta, origmsg, ctxt) {
    let transport = origmsg.transport$ || {};
    let callmeta = meta || msg.meta$ || {};
    let prior = callmeta.prior || {};
    actdef = actdef || {};
    return Object.assign({
        actid: callmeta.id,
        msg: msg,
        meta: meta,
        entry: prior.entry,
        prior: prior.chain,
        gate: origmsg.gate$,
        caller: origmsg.caller$,
        actdef: actdef,
        // these are transitional as need to be updated
        // to standard transport metadata
        client: actdef.client,
        listen: !!transport.origin,
        transport: transport,
    }, ctxt);
}
exports.make_standard_act_log_entry = make_standard_act_log_entry;
function make_standard_err_log_entry(err, ctxt) {
    if (!err)
        return ctxt;
    if (err.details && ctxt && ctxt.caller) {
        err.details.caller = ctxt.caller;
    }
    let entry = Object.assign({
        notice: err.message,
        code: err.code,
        err: err,
    }, ctxt);
    return entry;
}
exports.make_standard_err_log_entry = make_standard_err_log_entry;
function resolve_option(value, options) {
    return 'function' === typeof value ? value(options) : value;
}
exports.resolve_option = resolve_option;
function autoincr() {
    let counter = 0;
    return function () {
        return counter++;
    };
}
exports.autoincr = autoincr;
function inspect(val, opts) {
    return util_1.default.inspect(val, opts);
}
exports.inspect = inspect;
// Callpoint resolver. Indicates location in calling code.
function make_callpoint(active) {
    return function callpoint(override) {
        if (active || override) {
            return error.callpoint(new Error(), [
                '/ordu.js',
                '/seneca/seneca.js',
                '/seneca/lib/',
                '/lodash.js',
            ]);
        }
        else {
            return void 0;
        }
    };
}
exports.make_callpoint = make_callpoint;
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
exports.make_trace_desc = make_trace_desc;
// Stringify message for logs, debugging and errors. 
function msgstr(msg, len = 111) {
    let str = inspect(clean(msg))
        .replace(/\n/g, '');
    str = str.substring(0, len) +
        (len < str.length ? '...' : '');
    return str;
}
exports.msgstr = msgstr;
function jsonic_strify(val, opts, depth) {
    depth++;
    if (null == val)
        return 'null';
    var type = Object.prototype.toString.call(val).charAt(8);
    if ('F' === type && !opts.showfunc)
        return null;
    // WARNING: output may not be jsonically parsable!
    if (opts.custom) {
        if (Object.prototype.hasOwnProperty.call(val, 'toString')) {
            return val.toString();
        }
        else if (Object.prototype.hasOwnProperty.call(val, 'inspect')) {
            return val.inspect();
        }
    }
    var out, i = 0, j, k;
    if ('N' === type) {
        return isNaN(val) ? 'null' : val.toString();
    }
    else if ('O' === type) {
        out = [];
        if (depth <= opts.depth) {
            j = 0;
            for (let i in val) {
                if (j >= opts.maxitems)
                    break;
                var pass = true;
                for (k = 0; k < opts.exclude.length && pass; k++) {
                    pass = !~i.indexOf(opts.exclude[k]);
                }
                pass = pass && !opts.omit[i];
                let str = jsonic_strify(val[i], opts, depth);
                if (null != str && pass) {
                    var n = i.match(/^[a-zA-Z0-9_$]+$/) ? i : JSON.stringify(i);
                    out.push(n + ':' + str);
                    j++;
                }
            }
        }
        return '{' + out.join(',') + '}';
    }
    else if ('A' === type) {
        out = [];
        if (depth <= opts.depth) {
            for (; i < val.length && i < opts.maxitems; i++) {
                let str = jsonic_strify(val[i], opts, depth);
                if (null != str) {
                    out.push(str);
                }
            }
        }
        return '[' + out.join(',') + ']';
    }
    else {
        var valstr = val.toString();
        if (~" \"'\r\n\t,}]".indexOf(valstr[0]) ||
            !~valstr.match(/,}]/) ||
            ~" \r\n\t".indexOf(valstr[valstr.length - 1])) {
            valstr = "'" + valstr.replace(/'/g, "\\'") + "'";
        }
        return valstr;
    }
}
// Legacy Jsonic stringify
function jsonic_stringify(val, callopts) {
    try {
        callopts = callopts || {};
        var opts = {};
        opts.showfunc = callopts.showfunc || callopts.f || false;
        opts.custom = callopts.custom || callopts.c || false;
        opts.depth = callopts.depth || callopts.d || 3;
        opts.maxitems = callopts.maxitems || callopts.mi || 11;
        opts.maxchars = callopts.maxchars || callopts.mc || 111;
        opts.exclude = callopts.exclude || callopts.x || ['$'];
        var omit = callopts.omit || callopts.o || [];
        opts.omit = {};
        for (var i = 0; i < omit.length; i++) {
            opts.omit[omit[i]] = true;
        }
        var str = jsonic_strify(val, opts, 0);
        str = null == str ? '' : str.substring(0, opts.maxchars);
        return str;
    }
    catch (e) {
        return 'ERROR: jsonic_stringify: ' + e + ' input was: ' + JSON.stringify(val);
    }
}
exports.jsonic_stringify = jsonic_stringify;
const TRACE_PATTERN = 0;
exports.TRACE_PATTERN = TRACE_PATTERN;
const TRACE_ID = 1;
exports.TRACE_ID = TRACE_ID;
const TRACE_INSTANCE = 2;
exports.TRACE_INSTANCE = TRACE_INSTANCE;
const TRACE_TAG = 3;
exports.TRACE_TAG = TRACE_TAG;
const TRACE_VERSION = 4;
exports.TRACE_VERSION = TRACE_VERSION;
const TRACE_START = 5;
exports.TRACE_START = TRACE_START;
const TRACE_END = 6;
exports.TRACE_END = TRACE_END;
const TRACE_SYNC = 7;
exports.TRACE_SYNC = TRACE_SYNC;
const TRACE_ACTION = 8;
exports.TRACE_ACTION = TRACE_ACTION;
function history(opts) {
    return new ActHistory(opts);
}
exports.history = history;
class ActHistory {
    constructor(opts) {
        this._total = 0;
        this._list = [];
        this._map = {};
        let self = this;
        opts = opts || {};
        if (opts.prune) {
            this._prune_interval = setInterval(function () {
                self.prune(Date.now());
            }, opts.interval || 100);
            if (this._prune_interval.unref) {
                this._prune_interval.unref();
            }
        }
    }
    stats() {
        return {
            total: this._total,
        };
    }
    add(obj) {
        this._map[obj.id] = obj;
        let i = this._list.length - 1;
        if (i < 0 || this._list[i].timelimit <= obj.timelimit) {
            this._list.push(obj);
        }
        else {
            i = this.place(obj.timelimit);
            this._list.splice(i, 0, obj);
        }
    }
    place(timelimit) {
        let i = this._list.length;
        let s = 0;
        let e = i;
        if (0 === this._list.length) {
            return 0;
        }
        do {
            i = Math.floor((s + e) / 2);
            if (timelimit > this._list[i].timelimit) {
                s = i + 1;
                i = s;
            }
            else if (timelimit < this._list[i].timelimit) {
                e = i;
            }
            else {
                i++;
                break;
            }
        } while (s < e);
        return i;
    }
    prune(timelimit) {
        let i = this.place(timelimit);
        if (0 <= i && i <= this._list.length) {
            for (let j = 0; j < i; j++) {
                delete this._map[this._list[j].id];
            }
            this._list = this._list.slice(i);
        }
    }
    get(id) {
        return this._map[id] || null;
    }
    list() {
        return this._list;
    }
    close() {
        if (this._prune_interval) {
            clearInterval(this._prune_interval);
        }
    }
    toString() {
        return inspect({
            total: this._total,
            map: this._map,
            list: this._list,
        });
    }
    [util_1.default.inspect.custom]() {
        return this.toString();
    }
}
//# sourceMappingURL=common.js.map