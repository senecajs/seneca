declare type MakeSeneca = (() => Instance) & {
    use: any;
    test: any;
    quiet: any;
    util: any;
    valid: any;
    test$: any;
};
interface Instance extends Record<string, any> {
    version: string;
    id: string;
    did: string;
    fixedargs: any;
    fixedmeta: any;
    start_time: number;
}
interface ActDef {
    id: string;
    name: string;
    pattern: string;
    sub: boolean;
    client: boolean;
    deprecate: boolean;
    fixed: any;
    custom: any;
    args: any;
    msgcanon: any;
    func: any;
    raw: any;
    handle: any;
    priordef: ActDef;
    priorpath: string;
    rules: any[];
    gubu?: any;
    plugin_tag: string;
    plugin_name: string;
    plugin_fullname: string;
    plugin: {
        tag: string;
        name: string;
        fullname: string;
    };
    callpoint?: string;
}
export type { MakeSeneca, Instance, ActDef, };
