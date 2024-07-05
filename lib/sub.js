/* Copyright © 2020-2023 Richard Rodger and other contributors, MIT License. */
'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
exports.api_sub = api_sub;
const gubu_1 = require("gubu");
const common_1 = require("./common");
const Argu = (0, gubu_1.MakeArgu)('seneca');
const SubArgu = Argu('sub', {
    props: (0, gubu_1.One)((0, gubu_1.Empty)(String), Object),
    moreprops: (0, gubu_1.Skip)(Object),
    action: Function,
});
// Subscribe to messages.
function api_sub() {
    const self = this;
    // const subargs = Common.parsePattern(self, arguments, 'action:f')
    const args = SubArgu(arguments);
    // TODO: this is duplicated - need to be a util
    args.pattern = Object.assign({}, args.moreprops ? args.moreprops : null, 'string' === typeof args.props ?
        (0, common_1.parse_jsonic)(args.props, 'add_string_pattern_syntax') :
        args.props);
    const raw_pattern = args.pattern;
    const action = args.action;
    let is_inward = !!raw_pattern.in$;
    let is_outward = !!raw_pattern.out$;
    if (!is_outward) {
        is_inward = true; // Default if nothing specified
    }
    let pattern = raw_pattern;
    if (false !== raw_pattern.translate$) {
        // Must be exact match to ensure consistent translation
        let translation = this.private$.translationrouter.find(raw_pattern);
        if (translation) {
            pattern = translation(raw_pattern);
        }
    }
    const sub_pattern = self.util.clean(pattern);
    const routers = [
        is_inward ? self.private$.subrouter.inward : null,
        is_outward ? self.private$.subrouter.outward : null,
    ].filter((r) => r);
    routers.forEach((router) => {
        // Exact match, create if needed
        let sub_actions = router.find(sub_pattern, true);
        if (!sub_actions) {
            router.add(sub_pattern, (sub_actions = []));
            sub_actions.pattern = (0, common_1.pattern)(sub_pattern);
        }
        sub_actions.push(action);
    });
    return self;
}
//# sourceMappingURL=sub.js.map