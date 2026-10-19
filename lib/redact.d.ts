declare const SECRET_KEYS: string[];
declare const DEFAULT_MARK = "[REDACTED]";
type RedactSpec = {
    active?: boolean;
    keys?: string[];
    mark?: string;
};
type Redactor = {
    (val: any, max_depth?: number): any;
    active: boolean;
    mark: string;
    is_secret_key: (key: string) => boolean;
    is_secret_path: (path: string) => boolean;
    matches_key: (key: string) => boolean;
    argv: (args: any[]) => any[];
};
declare function make_redactor(spec?: RedactSpec): Redactor;
declare function redact_with(instance: any, val: any, max_depth?: number): any;
declare function type_name(val: any): string;
declare function describe_msg(instance: any, msg: any): string;
declare function describe_args(instance: any, args: any): string;
declare function shape_errors(err: any): any[] | null;
declare function describe_shape_errors(errs: any[]): string;
declare function redact_props(props: any, redact: Redactor | null): any[];
export type { Redactor, RedactSpec };
export { SECRET_KEYS, DEFAULT_MARK, make_redactor, redact_with, type_name, describe_msg, describe_args, shape_errors, describe_shape_errors, redact_props, };
