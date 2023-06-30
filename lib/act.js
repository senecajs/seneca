"use strict";
/* Copyright © 2019-2022 Richard Rodger and other contributors, MIT License. */
Object.defineProperty(exports, "__esModule", { value: true });
const meta_1 = require("./meta");
const common_1 = require("./common");
// Perform an action and optionally return the result by callback.
// The properties of the combined arguments are matched against known
// patterns, and the most specific one wins.
exports.api_act = function () {
    const instance = this;
    const opts = instance.options();
    const spec = (0, common_1.build_message)(instance, [...arguments], 'reply:f?', instance.fixedargs);
    const msg = spec.msg;
    const reply = spec.reply;
    // Capture caller code point if debugging.
    if (opts.debug.act_caller || opts.test) {
        msg.caller$ =
            '\n    Action call arguments and location: ' +
                (new Error((0, common_1.msgstr)(msg, opts.debug.datalen)).stack + '\n')
                    .replace(/Error: /, '')
                    .replace(/.*\/gate-executor\.js:.*\n/g, '')
                    .replace(/.*\/seneca\.js:.*\n/g, '')
                    .replace(/.*\/seneca\/lib\/.*\.js:.*\n/g, '');
    }
    intern.do_act(instance, opts, msg, reply);
    return instance;
};
// TODO: write specific test cases for these
const intern = (module.exports.intern = {
    do_act: function (instance, opts, origmsg, origreply) {
        let timedout = false;
        const actmsg = intern.make_actmsg(origmsg);
        const meta = new meta_1.Meta(instance, opts, origmsg, origreply);
        // Gated actions must complete before further actions can start.
        if (meta.gate) {
            instance = instance.delegate();
            instance.private$.ge = instance.private$.ge.gate();
        }
        const actctxt = {
            seneca: instance,
            origmsg: origmsg,
            reply: origreply || common_1.noop,
            options: instance.options(),
            callpoint: instance.private$.callpoint(),
        };
        const execspec = {};
        execspec.dn = meta.id;
        execspec.fn = function act_fn(complete) {
            const action_reply = (err, out, reply_meta) => {
                if (!timedout) {
                    intern.handle_reply(opts, meta, actctxt, actmsg, err, out, reply_meta);
                }
                complete();
            };
            try {
                intern.execute_action(execspec, instance, opts, actctxt, actmsg, meta, action_reply);
            }
            catch (e) {
                if (opts.error.capture.action && true !== (e === null || e === void 0 ? void 0 : e.$$seneca_callback_error$$)) {
                    const ex = opts.error.identify(e) ? e : new Error((0, common_1.inspect)(e));
                    intern.handle_reply(opts, meta, actctxt, actmsg, ex);
                    complete();
                }
                else {
                    throw e;
                }
            }
        };
        execspec.ontm = function act_tm(timeout, start, end) {
            timedout = true;
            const timeout_err = (0, common_1.error)('action_timeout', {
                timeout: timeout,
                start: start,
                end: end,
                message: actmsg,
                pattern: execspec.ctxt.pattern,
                legacy_string: actctxt.options.legacy.timeout_string
                    ? '[TIMEOUT] '
                    : '',
            });
            intern.handle_reply(opts, meta, actctxt, actmsg, timeout_err);
        };
        execspec.tm = meta.timeout;
        instance.private$.ge.add(execspec);
    },
    make_actmsg: function (origmsg) {
        const actmsg = Object.assign({}, origmsg);
        if (null != actmsg.id$) {
            delete actmsg.id$;
        }
        if (null != actmsg.caller$) {
            delete actmsg.caller$;
        }
        if (null != actmsg.meta$) {
            delete actmsg.meta$;
        }
        if (null != actmsg.prior$) {
            delete actmsg.prior$;
        }
        if (null != actmsg.parents$) {
            delete actmsg.parents$;
        }
        // backwards compatibility for Seneca 3.x transports
        if (null != origmsg.transport$) {
            actmsg.transport$ = origmsg.transport$;
        }
        return actmsg;
    },
    handle_reply: function (opts, meta, actctxt, actmsg, err, out, reply_meta) {
        meta.end = Date.now();
        const delegate = actctxt.seneca;
        const reply = actctxt.reply;
        const data = {
            meta: meta,
            msg: actmsg,
            res: err || out,
            reply_meta: reply_meta,
            has_callback: true,
            err: err || null,
            out: out || null,
        };
        actctxt.duration = meta.end - meta.start;
        actctxt.actlog = intern.actlog;
        actctxt.errlog = intern.errlog;
        actctxt.error = common_1.error;
        meta.error = opts.error.identify(data.res);
        // A nasty edge case
        if (!meta.error && data.res === data.err) {
            data.err = null;
        }
        // Add any additional explain items from responder
        if (meta.explain &&
            reply_meta &&
            reply_meta.explain &&
            meta.explain.length < reply_meta.explain.length) {
            for (let i = meta.explain.length; i < reply_meta.explain.length; i++) {
                meta.explain.push(reply_meta.explain[i]);
            }
        }
        intern.process_outward(actctxt, data);
        if (data.has_callback) {
            try {
                if (opts.legacy.meta_arg_remove) {
                    // Non-existence != undefined, so must be a separate call.
                    reply.call(delegate, data.err, data.res);
                }
                else {
                    reply.call(delegate, data.err, data.res, data.meta);
                }
            }
            catch (thrown_obj) {
                if (opts.error.capture.callback) {
                    intern.callback_error(delegate, thrown_obj, actctxt, data);
                }
                else {
                    if ('object' === typeof thrown_obj) {
                        thrown_obj.$$seneca_callback_error$$ = true;
                    }
                    throw thrown_obj;
                }
            }
        }
    },
    errlog: common_1.make_standard_err_log_entry,
    actlog: common_1.make_standard_act_log_entry,
    process_outward: function (actctxt, data) {
        const act_instance = actctxt.seneca;
        const outwardres = act_instance.order.outward.execSync(actctxt, data);
        if (outwardres.err) {
            throw outwardres.err;
        }
        const outward = outwardres.data;
        if (null != outward.kind) {
            if ('sub_outward_action_failed' === outward.code) {
                const info = {
                    pattern: actctxt.actdef.pattern,
                    msg: data.msg,
                    ...(outward.info || {}),
                };
                data.err = (0, common_1.error)(outward.error, outward.code, info);
            }
            // assume error
            else {
                data.err =
                    outward.error ||
                        (0, common_1.error)(outward.code || 'invalid-process-outward-code', outward.info || {});
            }
            data.meta = data.meta || {};
            data.meta.error = true;
        }
    },
    execute_action: function (execspec, act_instance, opts, actctxt, msg, meta, reply) {
        const private$ = act_instance.private$;
        const actdef = meta.prior
            ? private$.actdef[meta.prior]
            : act_instance.find(msg);
        const delegate = intern.make_act_delegate(act_instance, opts, meta, actdef);
        actctxt.seneca = delegate;
        actctxt.actdef = actdef;
        execspec.ctxt.pattern = actdef ? actdef.pattern : null;
        // TODO: move to a process_inward function
        const data = { meta: meta, msg: msg, reply: reply };
        const inwardres = act_instance.order.inward.execSync(actctxt, data);
        if (inwardres.err) {
            throw inwardres.err;
        }
        const inward = inwardres.data;
        if (intern.handle_inward_break(inward, act_instance, data, actdef, actctxt.origmsg)) {
            return;
        }
        if (!actdef.sub) {
            delegate.log.debug(intern.actlog(actdef, msg, meta, actctxt.origmsg, {
                kind: 'act',
                case: 'IN',
                did: delegate.did,
            }));
        }
        data.id = data.meta.id;
        data.result = [];
        data.timelimit = Date.now() + data.meta.timeout;
        if (opts.history.active) {
            private$.history.add(data);
        }
        if (opts.legacy.meta) {
            data.msg.meta$ = meta;
        }
        if (opts.legacy.meta_arg_remove) {
            // Non-existence != undefined, so must be a separate call.
            actdef.func.call(delegate, data.msg, data.reply);
        }
        else {
            actdef.func.call(delegate, data.msg, data.reply, data.meta);
        }
    },
    make_act_delegate: function (instance, _opts, meta, actdef) {
        meta = meta || {};
        actdef = actdef || {};
        const delegate_args = {
            plugin$: {
                full: actdef.plugin_fullname,
                name: actdef.plugin_name,
                tag: actdef.plugin_tag,
            },
        };
        const delegate = instance.delegate(delegate_args);
        const parent_act = instance.private$.act || meta.parent;
        delegate.private$.act = {
            parent: parent_act && parent_act.meta,
            meta: meta,
            def: actdef,
        };
        // special overrides
        if (meta.tx) {
            delegate.fixedargs.tx$ = meta.tx;
        }
        return delegate;
    },
    handle_inward_break: function (inward, act_instance, data, actdef, origmsg) {
        if (!inward)
            return false;
        const msg = data.msg;
        const reply = data.reply;
        const meta = data.meta;
        if ('error' === inward.kind) {
            let err = inward.error;
            // DESIGN: new contract - migrate to this for all inward functions
            if ('sub_inward_action_failed' === inward.code) {
                const info = {
                    pattern: actdef.pattern,
                    msg: data.msg,
                    ...(inward.info || {}),
                };
                err = (0, common_1.error)(err, inward.code, info);
            }
            else {
                err = err || (0, common_1.error)(inward.code, inward.info);
            }
            meta.error = true;
            if (inward.log && inward.log.level) {
                act_instance.log[inward.log.level](intern.errlog(err, intern.errlog(actdef || {}, meta.prior)));
            }
            reply.call(act_instance, err);
            return true;
        }
        else if ('result' === inward.kind) {
            if (inward.log && inward.log.level) {
                act_instance.log[inward.log.level](intern.actlog(actdef || {}, msg, meta, origmsg, inward.log.data));
            }
            reply.call(act_instance, null, inward.result);
            return true;
        }
    },
    callback_error: function (instance, thrown_obj, ctxt, data) {
        const duration = ctxt.duration;
        const act_callpoint = ctxt.callpoint;
        const actdef = ctxt.actdef || {};
        const origmsg = ctxt.origmsg;
        const reply = ctxt.reply;
        const meta = data.meta;
        const msg = data.msg;
        let err = instance.options().error.identify(thrown_obj)
            ? thrown_obj
            : new Error((0, common_1.inspect)(thrown_obj));
        const opts = instance.options();
        if (!err.seneca) {
            err = (0, common_1.error)(err, 'act_callback', (0, common_1.deep)({}, err.details, {
                message: err.message,
                pattern: actdef.pattern,
                fn: actdef.func,
                callback: reply,
                instance: instance.toString(),
                callpoint: act_callpoint,
            }));
        }
        instance.log.error(intern.actlog(actdef, msg, meta, origmsg, {
            // kind is act as this log entry relates to an action
            kind: 'act',
            case: 'ERR',
            info: err.message,
            code: err.code,
            err: err,
            duration: duration,
            did: instance.did,
        }));
        instance.emit('act-err', msg, err, data.res);
        if (opts.errhandler) {
            opts.errhandler.call(instance, err, err.meta$);
        }
    },
});
//# sourceMappingURL=act.js.map