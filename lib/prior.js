"use strict";
/* Copyright © 2019-2023 Richard Rodger and other contributors, MIT License. */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Prior = void 0;
const util_1 = __importDefault(require("util"));
const gubu_1 = require("gubu");
const { Ordu } = require('ordu');
// const Common = require('./common')
const { Inward } = require('./inward');
const Act = require('./act');
const { Meta } = require('./meta');
const common_1 = require("./common");
const Argu = (0, gubu_1.MakeArgu)('seneca');
const ActArgu = Argu('prior', {
    props: (0, gubu_1.One)((0, gubu_1.Empty)(String), Object),
    moreprops: (0, gubu_1.Skip)(Object),
    reply: (0, gubu_1.Skip)(Function),
});
const prior_inward = new Ordu({
    name: 'prior_inward',
})
    .add(Inward.inward_msg_modify)
    .add(Inward.inward_act_default)
    .add(Inward.inward_msg_meta)
    .add(Inward.inward_prepare_delegate);
function api_prior() {
    const opts = this.options();
    if (null == this.private$.act) {
        // TODO: should be a top level api method: seneca.fail
        throw this.util.error('no_prior_action', { args: arguments });
    }
    // Get definition of prior action
    var priordef = this.private$.act.def.priordef;
    // var spec = Common.build_message(this, arguments, 'reply:f?', this.fixedargs)
    const spec = ActArgu(arguments);
    // TODO: duplicated, should be utility
    spec.msg = Object.assign({}, spec.moreprops ? spec.moreprops : null, 'string' === typeof spec.props ?
        (0, common_1.parse_jsonic)(spec.props, 'msg_jsonic_syntax') :
        spec.props);
    // TODO: clean sufficiently so that seneca.util.clean not needed
    var msg = spec.msg;
    var reply = spec.reply;
    if (priordef) {
        if (opts.prior.direct) {
            let prior_reply = function (err, out, meta) {
                // First arg may be out, not err.
                let prior_err = util_1.default.types.isNativeError(err) ? err : null;
                let prior_out = null == out ? (prior_err ? null : err) : out;
                let prior_reply_args = [prior_err, prior_out];
                if (!opts.legacy.meta_arg_remove) {
                    prior_reply_args.push(meta);
                }
                return reply.apply(prior_instance, prior_reply_args);
            };
            // const prior_meta = new Act.intern.Meta(this, opts, msg, prior_reply)
            const prior_meta = new Meta(this, opts, msg, prior_reply);
            const prior_instance = Act.intern.make_act_delegate(this, opts, prior_meta, priordef);
            // Reply annotations.
            prior_reply.seneca = prior_instance;
            const ctx = {
                seneca: prior_instance,
                origmsg: msg,
                reply: prior_reply,
                options: opts,
                callpoint: this.private$.callpoint(),
                actdef: priordef,
            };
            const data = { meta: prior_meta, msg: msg, reply: prior_reply };
            const inwardres = prior_inward.execSync(ctx, data);
            if (inwardres.err) {
                throw inwardres.err;
            }
            // const inward = inwardres.data
            let prior_action = priordef.func;
            let prior_args = [msg, prior_reply];
            if (!opts.legacy.meta_arg_remove) {
                prior_args.push(data.meta);
            }
            prior_action.apply(prior_instance, prior_args);
        }
        else {
            msg.prior$ = priordef.id;
            this.act(msg, reply);
        }
    }
    else {
        var meta = msg.meta$ || {};
        var out = msg.default$ || meta.dflt || null;
        out = null == out ? out : Object.assign({}, out);
        if (opts.legacy.meta_arg_remove) {
            // Non-existence != undefined, so must be a separate call.
            return reply.call(this, null, out);
        }
        else {
            return reply.call(this, null, out, meta);
        }
    }
}
const Prior = {
    api_prior
};
exports.Prior = Prior;
//# sourceMappingURL=prior.js.map