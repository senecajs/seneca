/** Handle command line specific functionality */
declare function Print(seneca: any, process_argv: any): void;
declare namespace Print {
    var print_options: (instance: any, options: any) => void;
    var internal_log: (...args: any) => void;
    var internal_err: (...args: any) => void;
    var plugin_options: (instance: any, fullname: any, plugin_options: any) => void;
    var print: typeof print_reply;
}
declare function print_reply(this: any, err: any, out: any): void;
export { Print };
