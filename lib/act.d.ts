import { make_standard_err_log_entry, make_standard_act_log_entry } from './common';
declare function api_act(this: any): any;
declare function api_direct(this: any): any;
declare const intern: {
    prep_act: (instance: any, args: any) => any;
    do_act: (instance: any, opts: any, origmsg: any, origreply: any) => any;
    make_actmsg: (origmsg: any) => any;
    handle_reply: (opts: any, meta: any, actctxt: any, actmsg: any, err: any, out?: any, reply_meta?: any) => void;
    errlog: typeof make_standard_err_log_entry;
    actlog: typeof make_standard_act_log_entry;
    process_outward: (actctxt: any, data: any) => void;
    execute_action: (execspec: any, act_instance: any, opts: any, actctxt: any, msg: any, meta: any, reply: any) => any;
    make_act_delegate: (instance: any, msg: any, meta: any, actdef: any) => any;
    handle_inward_break: (inward: any, act_instance: any, data: any, actdef: any, origmsg: any) => boolean | undefined;
    callback_error: (instance: any, thrown_obj: any, ctxt: any, data: any) => void;
};
export { api_act, api_direct, intern, };
