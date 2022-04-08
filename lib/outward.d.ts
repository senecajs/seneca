declare function outward_make_error(spec: any): void;
declare function outward_act_cache(spec: any): void;
declare function outward_act_stats(spec: any): void;
declare function outward_res_object(spec: any): void;
declare function outward_announce(spec: any): void;
declare function outward_trace(spec: any): void;
declare function outward_msg_meta(spec: any): void;
declare function outward_act_error(spec: any): any;
declare function outward_res_entity(spec: any): void;
declare function outward_sub(spec: any): {
    op: string;
    out: {
        kind: string;
        code: string;
        error: unknown;
    };
} | undefined;
declare const Outward: {
    test$: {
        intern: any;
    };
    outward_act_cache: typeof outward_act_cache;
    outward_res_object: typeof outward_res_object;
    outward_act_stats: typeof outward_act_stats;
    outward_make_error: typeof outward_make_error;
    outward_announce: typeof outward_announce;
    outward_trace: typeof outward_trace;
    outward_act_error: typeof outward_act_error;
    outward_res_entity: typeof outward_res_entity;
    outward_msg_meta: typeof outward_msg_meta;
    outward_sub: typeof outward_sub;
};
export { Outward };
