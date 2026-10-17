"use strict";
/* Copyright © 2026 Richard Rodger and other contributors, MIT License. */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Deprecate = void 0;
// Deprecation warnings for the Seneca 3 names and behaviours that Seneca 4
// still supports, and that Seneca 5 removes.
//
// Each deprecation code is reported once per process, on two channels:
//
// * a warn-level Seneca log entry: { kind: 'notice', case: 'DEPRECATED',
//   code, notice }, on the instance that used the deprecated name (or the
//   most recently created instance, for static utilities);
// * a Node.js DeprecationWarning with the code SENECA_DEP_<CODE>, so that
//   node --no-deprecation, --trace-deprecation and --throw-deprecation
//   apply.
//
// The option debug.deprecation: false turns both off.
const errors_1 = __importDefault(require("./errors"));
const messages = errors_1.default.deprecation;
const reported = new Set();
// Fallback for deprecations reached without an instance (Seneca.util).
let current = null;
function track(instance) {
    current = instance;
}
function render(template, values) {
    return template.replace(/<%=\s*(\w+)\s*%>/g, (_m, key) => String(values[key] ?? ''));
}
// Report the deprecation `code` once. `key` distinguishes reports of the
// same code for different subjects (for example, per plugin).
function deprecate(instance, code, values = {}, key = code) {
    if (reported.has(key))
        return;
    const target = instance ?? current;
    let active = true;
    try {
        active = false !== target?.options?.().debug?.deprecation;
    }
    catch (_e) {
        // Options are not available during construction; report anyway.
    }
    if (!active)
        return;
    reported.add(key);
    const template = messages[code];
    const notice = null == template ? code : render(template, values);
    const nodeCode = 'SENECA_DEP_' + code.toUpperCase();
    target?.log?.warn({
        kind: 'notice',
        case: 'DEPRECATED',
        code: nodeCode,
        notice,
    });
    process.emitWarning(notice, { type: 'DeprecationWarning', code: nodeCode });
}
// A function that reports `code` and then calls `fn` with the same `this`.
function deprecated(code, fn) {
    const wrapper = function (...args) {
        deprecate(this && this.isSeneca ? this : null, code);
        return fn.apply(this, args);
    };
    Object.defineProperty(wrapper, 'name', { value: fn.name });
    return wrapper;
}
// For tests only: forget which codes were reported.
function reset() {
    reported.clear();
}
const Deprecate = {
    deprecate,
    deprecated,
    track,
    reset,
};
exports.Deprecate = Deprecate;
//# sourceMappingURL=deprecate.js.map