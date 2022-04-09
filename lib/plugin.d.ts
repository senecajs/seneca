import { Ordu } from 'ordu';
declare function api_use(callpoint: any, opts: any): {
    use: (this: any) => any;
    ordu: Ordu;
    tasks: any;
};
declare const Plugin: {
    api_use: typeof api_use;
    intern: {
        op: {
            seneca_plugin: (tr: any, ctx: any, data: any) => any;
            seneca_export: (tr: any, ctx: any, data: any) => any;
            seneca_options: (tr: any, ctx: any, data: any) => any;
            seneca_complete: (tr: any, _ctx: any, data: any) => any;
        };
        define_plugin: (delegate: any, plugin: any, options: any) => any;
        prepare_spec: (Joi: any, spec: any, opts: any, ctxt: any) => any;
        walk: (Joi: any, start_joiobj: any, obj: any, path: any, opts: any, ctxt: any, mod: any) => any;
    };
};
export { Plugin };
