/* Copyright © 2010-2021 Richard Rodger and other contributors, MIT License. */
'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
exports.TRACE_ACTION = exports.TRACE_SYNC = exports.TRACE_END = exports.TRACE_START = exports.TRACE_VERSION = exports.TRACE_TAG = exports.TRACE_INSTANCE = exports.TRACE_ID = exports.TRACE_PATTERN = exports.error = exports.inspect = exports.isError = exports.tagnid = exports.parsePattern = exports.print = exports.history = exports.make_trace_desc = exports.make_callpoint = exports.autoincr = exports.resolve_option = exports.make_standard_err_log_entry = exports.make_standard_act_log_entry = exports.makedie = exports.each = exports.deep = exports.clean = exports.noop = exports.pincanon = exports.pattern = exports.build_message = exports.parse_pattern = exports.parse_jsonic = exports.boolify = exports.make_plugin_key = exports.wrap_error = exports.stringify = exports.promiser = void 0;
const Util = require('util');
const Stringify = require('fast-safe-stringify');
const Eraro = require('eraro');
const Jsonic = require('jsonic');
const Nid = require('nid');
const Norma = require('norma');
const DefaultsDeep = require('lodash.defaultsdeep');
const Errors = require('./errors');
const { Print } = require('./print');
const error = (exports.error =
    exports.eraro =
        Eraro({
            package: 'seneca',
            msgmap: Errors,
            override: true,
        }));
exports.error = error;
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
    return Stringify(...arguments);
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
function boolify(v) {
    try {
        return !!JSON.parse(v);
    }
    catch (e) {
        return false;
    }
}
exports.boolify = boolify;
const tagnid = Nid({ length: 3, alphabet: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ' });
exports.tagnid = tagnid;
function parse_jsonic(str, code) {
    code = code || 'bad_jsonic';
    try {
        return null == str ? null : Jsonic(str);
    }
    catch (e) {
        let col = 1 === e.line ? e.column - 1 : e.column;
        throw error(code, {
            argstr: str,
            syntax: e.message,
            line: e.line,
            col: col,
        });
    }
}
exports.parse_jsonic = parse_jsonic;
// string args override object args
// TODO: fix name
function parse_pattern(instance, rawargs, normaspec, fixed) {
    let args = Norma('{strargs:s? objargs:o? moreobjargs:o? ' + (normaspec || '') + '}', rawargs);
    // Precedence of arguments in add,act is left-to-right
    args.pattern = Object.assign({}, args.moreobjargs ? args.moreobjargs : null, args.objargs ? args.objargs : null, parse_jsonic(args.strargs, 'add_string_pattern_syntax'), fixed);
    return args;
}
exports.parse_pattern = parse_pattern;
const parsePattern = parse_pattern;
exports.parsePattern = parsePattern;
function build_message(instance, rawargs, normaspec, fixed) {
    let args = Norma('{strargs:s? objargs:o? moreobjargs:o? ' + (normaspec || '') + '}', rawargs);
    // Precedence of arguments in add,act is left-to-right
    args.msg = Object.assign({}, args.moreobjargs, args.objargs, parse_jsonic(args.strargs, 'msg_jsonic_syntax'), fixed);
    return args;
}
exports.build_message = build_message;
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
        return pattern(Jsonic(inpin));
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
            else if (!Util.isError(err)) {
                err = new Error('string' === typeof err ? err : Util.inspect(err));
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
                Util.inspect(process.argv).replace(/\n/g, '') +
                (!full
                    ? ''
                    : !print_env
                        ? ''
                        : ', env=' + Util.inspect(process.env).replace(/\n/g, ''));
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
                Util.inspect(full
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
                Jsonic.stringify(logdesc) +
                '\nNODE      :::  ' +
                process.version +
                ', ' +
                process.title +
                (!full
                    ? ''
                    : ', ' +
                        Util.inspect(process.versions).replace(/\s+/g, ' ') +
                        ', ' +
                        Util.inspect(process.features).replace(/\s+/g, ' ') +
                        ', ' +
                        Util.inspect(process.moduleLoadList).replace(/\s+/g, ' ')) +
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
                                    err: Util.inspect(close_err),
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
                panic: Util.inspect(panic),
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
function isError(x) {
    return Util.isError(x);
}
exports.isError = isError;
function inspect(x) {
    return Util.inspect(x);
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
        return Util.inspect({
            total: this._total,
            map: this._map,
            list: this._list,
        });
    }
    [Util.inspect.custom]() {
        return this.toString();
    }
}
//# sourceMappingURL=common.js.map