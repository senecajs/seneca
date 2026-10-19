import type { EventEmitter } from 'events';
import { Shape } from 'shape';
declare function SenecaInstance(this: any): void;
declare function Seneca(seneca_options?: Seneca.Options | string, more_options?: Seneca.Options): Seneca.Instance;
declare namespace Seneca {
    var Seneca: typeof SenecaInstance;
    var use: (plugin: Plugin, options?: Record<string, any> | undefined) => Seneca.Instance;
    var test: (errhandler?: string | ((err?: Error) => void) | undefined, logspec?: any) => Seneca.Instance;
    var quiet: () => Seneca.Instance;
    var util: Util;
    var valid: Shape;
    var test$: {
        intern: any;
    };
}
/**
 * The public types: Seneca.Instance, Seneca.Options and so on. A Seneca
 * instance is assembled at runtime (see make_seneca), so these types are
 * written by hand to describe the documented API (docs/reference/api.md),
 * rather than inferred from the implementation.
 *
 * Plugins that add members to instances (with seneca.decorate, for
 * example) declare them by augmenting Instance:
 *
 *     declare module 'seneca' {
 *       interface Instance {
 *         make$(name: string): Entity
 *       }
 *     }
 */
declare namespace Seneca {
    /** The meta data of a message, passed to actions and callbacks. */
    interface Meta {
        id: string;
        mi: string;
        tx: string;
        start: number;
        end?: number;
        pattern?: string;
        action?: string;
        instance: string;
        tag: string;
        seneca: string;
        version: string;
        gate: boolean;
        fatal: boolean;
        closing: boolean;
        sync: boolean;
        local: boolean;
        remote: boolean;
        direct: boolean;
        timeout: number;
        dflt: any;
        custom: Record<string, any> | null;
        plugin: any;
        prior: any;
        caller: any;
        parents: any;
        trace: any;
        sub: any;
        data: any;
        err: any;
        err_trace: any;
        error: any;
        empty: any;
        [key: string]: any;
    }
    /** A message or pattern property map. */
    type Msg = Record<string, any>;
    /** A pattern or message: an object, or a Jsonic string such as 'a:1,b:2'. */
    type Pattern = string | Msg;
    /** A message result: an object or an array, or null. */
    type Result = Record<string, any> | any[] | null;
    /** The reply function passed to an action. Call it exactly once. */
    interface Reply {
        (err: Error | null | undefined, result?: Result): void;
        (result?: Result | Error): void;
    }
    /** An action: replies through reply, or returns its result for direct calls. */
    type ActionFunc = (this: Instance, msg: Msg, reply: Reply, meta: Meta) => any;
    /** An action written as an async function (seneca.message). */
    type MessageFunc = (this: Instance, msg: Msg, meta: Meta) => Promise<Result | void>;
    /** The callback of seneca.act. */
    type ActCallback = (this: Instance, err: Error | null, result?: any, meta?: Meta) => void;
    /** A subscription function (seneca.sub). */
    type SubFunc = (this: Instance, msg: Msg, result: any, meta: Meta) => void;
    /** An action definition, as returned by seneca.find. */
    interface ActDef {
        id: string;
        name: string;
        func: ActionFunc;
        pattern: string;
        msgcanon: Msg;
        raw: Msg;
        plugin: {
            name: string;
            tag: string;
            fullname: string;
        };
        plugin_name: string;
        plugin_tag: string;
        plugin_fullname: string;
        priordef?: ActDef;
        priorpath: string;
        fixed: Msg;
        custom: Msg;
        rules: Msg;
        /** The compiled message shape, present when the pattern has rules. */
        shape?: (msg: Msg) => Msg;
        /** @deprecated Use shape. Removed in Seneca 5. */
        readonly gubu?: (msg: Msg) => Msg;
        sub?: boolean;
        client?: boolean;
        client_pattern?: string;
        deprecate?: string;
        callpoint?: string;
        handle?: (...args: any[]) => any;
        /** Other properties given to seneca.add, such as desc. */
        [key: string]: any;
    }
    /** A loaded plugin, as returned by seneca.find_plugin. */
    interface PluginRecord {
        name: string;
        tag: string;
        fullname: string;
        options: Record<string, any>;
        shared: Record<string, any>;
        [key: string]: any;
    }
    /** A plugin definition function. `this` is the plugin delegate. */
    type PluginDefine = (this: Instance, options: any) => void | Record<string, any> | Promise<void | Record<string, any>>;
    /** A plugin description object, for seneca.use. See docs/reference/plugins.md. */
    interface PluginDesc {
        name?: string;
        tag?: string;
        define?: PluginDefine;
        /** @deprecated Use define. Removed in Seneca 5. */
        init?: PluginDefine;
        defaults?: Record<string, any> | ((spec: {
            valid: Shape;
        }) => Record<string, any>);
        errors?: Record<string, string>;
        preload?: (this: Instance, plugin: PluginRecord) => any;
        exports?: Record<string, any>;
        exportmap?: Record<string, any>;
        export?: any;
        extend?: {
            action_modifier?: (actdef: ActDef) => void;
            logger?: (...args: any[]) => any;
        };
        order?: {
            plugin?: any;
        };
        /** Legacy: a function kept as plugin.service. */
        service?: (...args: any[]) => any;
    }
    /** A plugin: a module name, a definition function, or a description. */
    type Plugin = string | PluginDefine | PluginDesc;
    /** The logger: callable, with a method per level. */
    interface Logger {
        (...entry: any[]): void;
        debug(...entry: any[]): void;
        info(...entry: any[]): void;
        warn(...entry: any[]): void;
        error(...entry: any[]): void;
        fatal(...entry: any[]): void;
        all(...entry: any[]): void;
        none(...entry: any[]): void;
    }
    /** Utilities available as seneca.util and Seneca.util. */
    interface Util {
        Eraro: any;
        Jsonic: any;
        Nid: any;
        Patrun: any;
        Gex: any;
        Shape: Shape;
        /** @deprecated Use Shape. Removed in Seneca 5. */
        readonly Gubu: Shape;
        pins(pin: any): Msg[];
        clean<T extends Msg>(obj: T): T;
        pattern(patobj: Pattern): string;
        print(...args: any[]): void;
        error(code: string | Error, details?: Record<string, any>): Error;
        deep(...objs: any[]): any;
        /** @deprecated Use deep. Removed in Seneca 5. */
        deepextend(...objs: any[]): any;
        pincanon(pin: any): string;
        router(): any;
        resolve_option(value: any, options?: any): any;
        /** @deprecated Removed in Seneca 5. */
        flatten(obj: any, prop: string): any[];
    }
    /** Options for Seneca(options). See docs/reference/options.md. */
    interface Options {
        tag?: string;
        timeout?: number;
        idlen?: number;
        didlen?: number;
        id$?: string;
        default_plugins?: Record<string, boolean>;
        test?: boolean;
        quiet?: boolean;
        log?: any;
        logger?: any;
        death_delay?: number;
        /** @deprecated Use death_delay. Removed in Seneca 5. */
        deathdelay?: number;
        close_delay?: number;
        errhandler?: ((this: Instance, err: Error, meta?: Meta) => any) | null;
        from?: string;
        module?: any;
        error?: Record<string, any>;
        valid?: {
            active?: boolean;
            message?: boolean;
            option?: boolean;
            plugin?: boolean;
        };
        debug?: {
            fragile?: boolean;
            undead?: boolean;
            print?: Record<string, any>;
            act_caller?: boolean;
            short_logs?: boolean;
            callpoint?: boolean;
            deprecation?: boolean;
            argv?: string[] | null;
            env?: Record<string, string> | null;
            datalen?: number;
        };
        /** Keep secrets out of logs, error details and printed reports. See docs/reference/options.md#redact. */
        redact?: {
            active?: boolean;
            keys?: string[];
            mark?: string;
        };
        strict?: {
            result?: boolean;
            fixedargs?: boolean;
            add?: boolean;
            find?: boolean;
            maxloop?: number;
            exports?: boolean;
        };
        history?: {
            active?: boolean;
            prune?: boolean;
            interval?: number;
        };
        trace?: Record<string, any>;
        stats?: {
            size?: number;
            interval?: number;
            running?: boolean;
        };
        plugin?: Record<string, any>;
        plugins?: Record<string, any> | any[] | null;
        system?: {
            exit?: (code?: number) => void;
            close_signals?: Record<string, boolean>;
            plugin?: {
                load_once?: boolean;
            };
            action?: {
                add?: boolean;
            };
        };
        internal?: Record<string, any>;
        status?: {
            interval?: number;
            running?: boolean;
        };
        transport?: Record<string, any>;
        limits?: {
            maxparents?: number;
        };
        events?: Record<string, (...args: any[]) => void>;
        legacy?: boolean | {
            meta?: boolean;
            builtin_actions?: boolean;
            /** @deprecated Has no effect. Removed in Seneca 5. */
            error?: boolean;
            [removed_flag: string]: boolean | undefined;
        };
        order?: Record<string, {
            debug?: boolean;
        }>;
        prior?: {
            direct?: boolean;
        };
        /** Plugin options, by plugin name. */
        [plugin_options: string]: any;
    }
    /** A Seneca instance, or a delegate of one. See docs/reference/api.md. */
    interface Instance extends EventEmitter {
        readonly id: string;
        readonly did: string;
        readonly tag: string;
        readonly version: string;
        readonly start_time: number;
        readonly root: Instance;
        readonly isSeneca: true;
        fixedargs: Msg;
        fixedmeta: Msg;
        context: Record<string, any>;
        flags: {
            closed: boolean;
        };
        /** @deprecated Use flags.closed. Removed in Seneca 5. */
        readonly closed: boolean;
        /** Shape builders for validation rules and plugin defaults. */
        valid: Shape;
        util: Util;
        log: Logger;
        /** Inside a plugin: the plugin record and the plugin's shared object. */
        plugin?: PluginRecord;
        shared?: Record<string, any>;
        /** Internal state. Not part of the public API. */
        private$: any;
        add(pattern: Pattern, action?: ActionFunc, actdef?: Partial<ActDef>): this;
        add(pattern: Pattern, moreProps: Msg, action?: ActionFunc, actdef?: Partial<ActDef>): this;
        message(pattern: Pattern, action: MessageFunc): this;
        message(pattern: Pattern, moreProps: Msg, action: MessageFunc): this;
        act(msg: Pattern, callback?: ActCallback): this;
        act(msg: Pattern, moreProps: Msg, callback?: ActCallback): this;
        post<T = any>(msg: Pattern, moreProps?: Msg): Promise<T>;
        direct<T = any>(msg: Pattern, moreProps?: Msg): T;
        prior(msg: Msg, reply: Reply | ActCallback): void;
        prior<T = any>(msg: Msg): Promise<T>;
        direct_prior<T = any>(msg: Pattern, moreProps?: Msg): T;
        reply(spec: {
            meta: Meta | Msg;
            err?: Error | null;
            out?: any;
        }): boolean;
        wrap(pin: Pattern | Pattern[], wrapper: ActionFunc): this;
        wrap(pin: Pattern | Pattern[], actdef: Partial<ActDef>, wrapper: ActionFunc): this;
        fix(pattern: Pattern, fixedMsgProps?: Msg, customMeta?: Msg): Instance;
        translate(from: Pattern, to: Pattern, pick?: string | string[] | Record<string, boolean>, flags?: Record<string, any>): this;
        inward(step: (spec: any) => any): this;
        outward(step: (spec: any) => any): this;
        sub(pattern: Pattern, fn: SubFunc): this;
        sub(pattern: Pattern, moreProps: Msg, fn: SubFunc): this;
        gate(): Instance;
        ungate(): this;
        delegate(fixedargs?: Msg, fixedmeta?: Msg): Instance;
        ready(fn: (this: Instance) => void): this;
        ready(): Promise<Instance>;
        close(done: (err?: Error | null) => void): this;
        close(): Promise<void>;
        options(): Options & Record<string, any>;
        options(opts: Options, chain?: false): Options & Record<string, any>;
        options(opts: Options, chain: true): this;
        use(plugin: Plugin, options?: Record<string, any>): this;
        decorate(name: string, value: any): void;
        prepare(fn: (this: Instance) => Promise<void> | void): this;
        destroy(fn: (this: Instance) => Promise<void> | void): this;
        init(fn: (done: (err?: Error | null) => void) => void): this;
        error(handler: (this: Instance, err: Error, meta?: Meta) => any): this;
        error(code: string, details?: Record<string, any>): Error;
        fail(code: string, details?: Record<string, any>): Error;
        fail(condition: boolean, code: string, details?: Record<string, any>): Error;
        test(errhandler?: ((err?: Error) => void) | string, logspec?: any): this;
        quiet(): this;
        explain(on: boolean): any[] | undefined;
        explain(entry?: any): any;
        die(err: Error): void;
        export(key: string): any;
        depends(name: string, ...deps: (string | string[])[]): void;
        list_plugins(): Record<string, PluginRecord>;
        find_plugin(name: string, tag?: string): PluginRecord | undefined;
        has_plugin(name: string, tag?: string): boolean;
        ignore_plugin(name: string, tag?: string, ignore?: boolean): this;
        has(pattern: Pattern): boolean;
        find(pattern: Pattern, flags?: {
            exact?: boolean;
        }): ActDef | null;
        list(pattern?: Pattern): Msg[];
        status(spec?: {
            stats?: Msg;
        }): Record<string, any>;
        stats(msg?: Msg): Record<string, any>;
        ping(): Record<string, any>;
        idgen(): string;
        listen(config?: any, callback?: (...args: any[]) => void): this;
        client(config?: any): this;
        seneca(): this;
        toString(): string;
        /** @deprecated Use find. */
        findact(pattern: Pattern, flags?: {
            exact?: boolean;
        }): ActDef | null;
        /** @deprecated Use find(pattern, { exact: false }), or has. */
        hasact(pattern: Pattern): boolean;
        /** @deprecated Call act inside an if statement. */
        act_if(execute: boolean, ...actargs: any[]): this;
        /** @deprecated Use list. */
        findpins(...patterns: (Pattern | Pattern[])[]): Msg[];
        /** @deprecated Use list. */
        pinact(...patterns: (Pattern | Pattern[])[]): Msg[];
        /** @deprecated Use list_plugins. */
        plugins(): Record<string, PluginRecord>;
        /** @deprecated Use find_plugin. */
        findplugin(name: string, tag?: string): PluginRecord | undefined;
        /** @deprecated Use has_plugin. */
        hasplugin(name: string, tag?: string): boolean;
    }
}
export = Seneca;
