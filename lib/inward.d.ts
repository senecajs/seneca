declare function inward_msg_modify(spec: any): void;
declare function inward_limit_msg(spec: any): {
    op: string;
    out: {
        kind: string;
        code: string;
        info: {
            maxparents: any;
            numparents: any;
            parents: any;
            args: string;
        };
    };
} | undefined;
declare function inward_announce(spec: any): void;
declare function inward_closed(spec: any): {
    op: string;
    out: {
        kind: string;
        code: string;
        info: {
            args: string;
        };
    };
} | undefined;
declare function inward_act_stats(spec: any): void;
declare function inward_act_default(spec: any): {
    op: string;
    out: {
        kind: string;
        result: any;
        log: {
            level: string;
            data: {
                kind: string;
                case: string;
            };
        };
        code?: undefined;
        info?: undefined;
    };
} | {
    op: string;
    out: {
        kind: string;
        code: string;
        info: {
            args: string;
            xdefault: string;
        };
        result?: undefined;
        log?: undefined;
    };
} | undefined;
declare function inward_act_not_found(spec: any): {
    op: string;
    out: {
        kind: string;
        code: string;
        info: {
            args: string;
        };
        log: {
            level: string;
            data: {
                kind: string;
                case: string;
            };
        };
    };
} | undefined;
declare function inward_validate_msg(spec: any): {
    op: string;
    out: {
        kind: string;
        code: string;
        info: {
            pattern: any;
            message: any;
            msg: any;
            error: any;
            props: any;
        };
        log: {
            level: string | null;
            data: {
                kind: string;
                case: string;
            };
        };
    };
} | undefined;
declare function inward_act_cache(spec: any): {
    op: string;
    out: {
        kind: string;
        result: any;
        error: any;
        log: {
            level: string;
            data: {
                kind: string;
                case: string;
                cachetime: any;
            };
        };
    };
} | undefined;
declare function inward_warnings(spec: any): void;
declare function inward_msg_meta(spec: any): void;
declare function inward_prepare_delegate(spec: any): void;
declare function inward_sub(spec: any): {
    op: string;
    out: {
        kind: string;
        code: string;
        error: unknown;
    };
} | undefined;
declare let Inward: {
    inward_msg_modify: typeof inward_msg_modify;
    inward_closed: typeof inward_closed;
    inward_act_cache: typeof inward_act_cache;
    inward_act_default: typeof inward_act_default;
    inward_act_not_found: typeof inward_act_not_found;
    inward_validate_msg: typeof inward_validate_msg;
    inward_warnings: typeof inward_warnings;
    inward_msg_meta: typeof inward_msg_meta;
    inward_limit_msg: typeof inward_limit_msg;
    inward_act_stats: typeof inward_act_stats;
    inward_prepare_delegate: typeof inward_prepare_delegate;
    inward_announce: typeof inward_announce;
    inward_sub: typeof inward_sub;
    intern: any;
};
export { Inward };
