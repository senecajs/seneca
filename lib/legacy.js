"use strict";
/* Copyright © 2010-2023 Richard Rodger and other contributors, MIT License. */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Legacy = void 0;
const util_1 = __importDefault(require("util"));
const errors_1 = __importDefault(require("./errors"));
const Flatten = require('lodash.flatten');
const Eraro = require('eraro');
const Jsonic = require('jsonic');
const Common = require('./common');
const gubu_1 = require("gubu");
const Argu = (0, gubu_1.MakeArgu)('seneca');
const internals = {
    error: Eraro({
        package: 'seneca',
        msgmap: errors_1.default,
        override: true,
    }),
};
// All methods here are DEPRECATED
// To be marked as DEPRECATED in Seneca 4.x
// To be REMOVED in Seneca 5.x
function flatten(obj, prop) {
    var out = [];
    while (null != obj && 0 < obj.length) {
        var entry = Common.deep(obj[0]);
        delete entry.prop;
        out.push(entry);
        obj = obj[0][prop];
    }
    return out;
}
// noop for callbacks
function nil() {
    for (var i = 0; i < arguments.length; i++) {
        if ('function' === typeof arguments[i]) {
            return arguments[i]();
        }
    }
}
function copydata(obj) {
    var copy;
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
// loop over a list of items recursively
// list can be an integer - number of times to recurse
function recurse(list, work, done) {
    var ctxt = this;
    if ('number' === typeof list) {
        list = Array.from({ length: list }, (_, i) => i);
    }
    else {
        list = [...list];
    }
    function next(err, out) {
        if (err)
            return done(err, out);
        var item = list.shift();
        if (void 0 !== item) {
            work.call(ctxt, item, next);
        }
        else {
            done.call(ctxt, err, out);
        }
    }
    next.call(ctxt);
}
// use args properties as fields
// defaults: map of default values
// args: args object
// fixed: map of fixed values - cannot be overriden
// omits: array of prop names to exclude
// defaults, args, and fixed are deeped together in that order
function argprops(defaults, args, fixed, omits) {
    omits = Array.isArray(omits)
        ? omits
        : omits && 'object' === typeof omits
            ? Object.keys(omits)
            : 'string' === typeof omits
                ? omits.split(/\s*,\s*/)
                : '' + omits;
    var usedargs = Common.clean(Object.assign({}, args));
    usedargs = Common.deep(defaults, usedargs, fixed);
    omits.forEach((omit) => delete usedargs[omit]);
    return usedargs;
}
function next_act() {
    var argsarr = new Array(arguments.length);
    for (var l = 0; l < argsarr.length; ++l) {
        argsarr[l] = arguments[l];
    }
    var si = this;
    si.log.warn({
        kind: 'notice',
        case: 'DEPRECATION',
        notice: errors_1.default.deprecation.seneca_next_act,
    });
    return function (next) {
        argsarr.push(next);
        si.act.apply(si, argsarr);
    };
}
function findpins() {
    var self = this;
    var argsarr = new Array(arguments.length);
    for (var l = 0; l < argsarr.length; ++l) {
        argsarr[l] = arguments[l];
    }
    var pins = [];
    var patterns = Flatten(argsarr);
    patterns.forEach(function (pattern) {
        pattern = 'string' === typeof pattern ? Jsonic(pattern) : pattern;
        pins = pins.concat(self.private$.actrouter.list(pattern).map(function (desc) {
            return desc.match;
        }));
    });
    return pins;
}
function act_if() {
    var self = this;
    const args = Argu(arguments, {
        execute: Boolean,
        actargs: (0, gubu_1.Rest)((0, gubu_1.Any)()),
    });
    if (args.execute) {
        return self.act.apply(self, args.actargs);
    }
    else
        return self;
}
function hasact(pattern) {
    return !!this.find(pattern, { exact: false });
}
function make_legacy_fail(so) {
    return function () {
        var _a;
        var argsarr = new Array(arguments.length);
        for (var l = 0; l < argsarr.length; ++l) {
            argsarr[l] = arguments[l];
        }
        var cb = 'function' === typeof argsarr[argsarr.length - 1]
            ? argsarr[argsarr.length - 1]
            : null;
        if (cb) {
            argsarr.pop();
        }
        if (argsarr[0] && 'object' === typeof argsarr[0]) {
            var code = argsarr[0].code;
            if ('string' === typeof code) {
                argsarr.unshift(code);
            }
        }
        var err = internals.error.apply(null, argsarr);
        err.callpoint = (((_a = (new Error()).stack) === null || _a === void 0 ? void 0 : _a.match(/^.*\n.*\n\s*(.*)/)) || [])[1];
        err.seneca = { code: err.code, valmap: err.details };
        this.log.error(Common.make_standard_err_log_entry(err));
        if (so.errhandler) {
            so.errhandler.call(this, err);
        }
        if (cb) {
            cb.call(this, err);
        }
        return err;
    };
}
const Legacy = {
    flatten,
    nil,
    copydata,
    recurse,
    argprops,
    next_act,
    findpins,
    act_if,
    hasact,
    make_legacy_fail,
};
exports.Legacy = Legacy;
//# sourceMappingURL=legacy.js.map