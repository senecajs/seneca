import { make_standard_err_log_entry, make_standard_act_log_entry } from './common';
declare function act(this: any, ...args: any[]): any;
declare function post(this: any, ...args: any[]): Promise<unknown>;
declare function do_act(instance: any, opts: any, origmsg: any, origreply: any): void;
declare function make_actmsg(origmsg: any): any;
declare function handle_reply(opts: any, meta: any, actctxt: any, actmsg: any, err: any, out?: any, reply_meta?: any): void;
declare function process_outward(actctxt: any, data: any): void;
declare function execute_action(execspec: any, act_instance: any, opts: any, actctxt: any, msg: any, meta: any, reply: any): void;
declare function make_act_delegate(instance: any, _opts: any, meta: any, actdef: any): any;
declare function handle_inward_break(inward: any, act_instance: any, data: any, actdef: any, origmsg: any): boolean | undefined;
declare function callback_error(instance: any, thrown_obj: any, ctxt: any, data: any): void;
declare const Act: {
    act: typeof act;
    post: typeof post;
    intern: {
        do_act: typeof do_act;
        make_actmsg: typeof make_actmsg;
        handle_reply: typeof handle_reply;
        process_outward: typeof process_outward;
        execute_action: typeof execute_action;
        make_act_delegate: typeof make_act_delegate;
        handle_inward_break: typeof handle_inward_break;
        callback_error: typeof callback_error;
        errlog: typeof make_standard_err_log_entry;
        actlog: typeof make_standard_act_log_entry;
    };
};
export { Act };
