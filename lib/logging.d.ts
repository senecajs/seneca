declare function make_logging(): {
    default_logspec: any;
    level_abbrev: any;
    load_logger: typeof load_logger;
    build_log_spec: typeof build_log_spec;
    build_log: typeof build_log;
    flat_logger: typeof flat_logger;
    test_logger: typeof test_logger;
    json_logger: typeof json_logger;
};
declare namespace make_logging {
    var intern: {
        build_act_entry: (act: any, entry: any) => void;
    };
}
declare function flat_logger(this: any, entry: any): void;
declare function json_logger(this: any, entry: any): void;
declare function test_logger(this: any, entry: any): void;
declare function load_logger(instance: any, log_plugin: any): any;
declare function build_log_spec(self: any): any;
declare function build_log(self: any): any;
export { make_logging };
