"use strict";
/* Copyright © 2019-2023 Richard Rodger and other contributors, MIT License. */
Object.defineProperty(exports, "__esModule", { value: true });
exports.Prior = void 0;
const gubu_1 = require("gubu");
// const { Ordu } = require('ordu')
// const Common = require('./common')
// const { Inward } = require('./inward')
// const Act = require('./act')
// const { Meta } = require('./meta')
const common_1 = require("./common");
const Argu = (0, gubu_1.MakeArgu)('seneca');
const ActArgu = Argu('prior', {
    props: (0, gubu_1.One)((0, gubu_1.Empty)(String), Object),
    moreprops: (0, gubu_1.Skip)(Object),
    reply: (0, gubu_1.Skip)(Function),
});
// const prior_inward = new Ordu({
//   name: 'prior_inward',
// })
//   .add(Inward.inward_msg_modify)
//   .add(Inward.inward_act_default)
//   .add(Inward.inward_msg_meta)
//   .add(Inward.inward_prepare_delegate)
function api_prior() {
    if (null == this.private$.act) {
        // TODO: should be a top level api method: seneca.fail
        throw this.util.error('no_prior_action', { args: arguments });
    }
    // Get definition of prior action
    const priordef = this.private$.act.def.priordef;
    // var spec = Common.build_message(this, arguments, 'reply:f?', this.fixedargs)
    const spec = ActArgu(arguments);
    // TODO: duplicated, should be utility
    spec.msg = Object.assign({}, spec.moreprops ? spec.moreprops : null, 'string' === typeof spec.props ?
        (0, common_1.parse_jsonic)(spec.props, 'msg_jsonic_syntax') :
        spec.props);
    // TODO: clean sufficiently so that seneca.util.clean not needed
    const msg = spec.msg;
    const reply = spec.reply;
    if (priordef) {
        msg.prior$ = priordef.id;
        return reply ? this.act(msg, reply) : this.post(msg);
    }
    else {
        const meta = msg.meta$ || {};
        let out = msg.default$ || meta.dflt || null;
        out = null == out ? out : Object.assign({}, out);
        return reply ? reply.call(this, null, out, meta) : out;
    }
}
const Prior = {
    api_prior
};
exports.Prior = Prior;
//# sourceMappingURL=prior.js.map