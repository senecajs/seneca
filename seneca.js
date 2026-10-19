/* Copyright © 2010-2023 Richard Rodger and other contributors, MIT License. */
'use strict';
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
// Node API modules.
const events_1 = __importDefault(require("events"));
const util_1 = __importDefault(require("util"));
// External modules.
const eraro_1 = __importDefault(require("eraro"));
const gate_executor_1 = __importDefault(require("gate-executor"));
const jsonic_1 = __importDefault(require("jsonic"));
const nid_1 = __importDefault(require("nid"));
const ordu_1 = require("ordu");
const patrun_1 = require("patrun");
const rolling_stats_1 = __importDefault(require("rolling-stats"));
const shape_1 = require("shape");
// Untyped external modules.
const UsePlugin = require('use-plugin');
// Internal modules.
const Act = require("./lib/act");
const actions_1 = require("./lib/actions");
const Add = require("./lib/add");
const api_1 = require("./lib/api");
const Common = require("./lib/common");
const deprecate_1 = require("./lib/deprecate");
const inward_1 = require("./lib/inward");
const legacy_1 = require("./lib/legacy");
const logging_1 = require("./lib/logging");
const options_1 = require("./lib/options");
const redact_1 = require("./lib/redact");
const outward_1 = require("./lib/outward");
const plugin_1 = require("./lib/plugin");
const print_1 = require("./lib/print");
const prior_1 = require("./lib/prior");
const ready_1 = require("./lib/ready");
const Sub = require("./lib/sub");
const transport_1 = require("./lib/transport");
const package_json_1 = __importDefault(require("./package.json"));
// Internal data and utilities.
const { error, deep } = Common;
const { One, Any, Skip, Open } = shape_1.Shape;
// Seneca options.
const option_defaults = {
    // Tag this Seneca instance, will be appended to instance identifier.
    tag: '-', // TODO: FIX: Shape api.test.js#292
    // Standard timeout for actions.
    timeout: 22222,
    // Standard length of identifiers for actions.
    idlen: 12,
    didlen: 4,
    // Manually set instance identifier.
    id$: Skip(String),
    // Register (true) default plugins. Set false to not register when
    // using custom versions.
    default_plugins: Open({}),
    // Test mode. Use for unit testing.
    test: false,
    // Quiet mode. Moves log level to warn. Use for unit testing.
    quiet: false,
    // Default logging specification - see lib/logging.js
    log: Any((0, logging_1.make_logging)().default_logspec),
    // Custom logger function, optional - see lib/logging.js
    logger: One(Function, Object, String, null),
    // Wait time for plugins to close gracefully.
    death_delay: 11111,
    // Deprecated alias of death_delay. Remove in Seneca 5.
    deathdelay: 11111,
    // Wait time for actions to complete before shutdown.
    close_delay: 22222,
    // Legacy; specify general error handler
    errhandler: Skip(One(Function, null)),
    // Load options from a file path
    from: Skip(String),
    // Provide a module to base option require loading from
    module: Skip(),
    // Control error handling.
    error: {
        // Control capture of errors for logging.
        capture: {
        // Capture errors in action callbacks (false throws uncaught).
        // callback: true,
        // Capture errors in actions and pass to callback (false throws uncaught).
        // action: true,
        },
        // Custom function to identify thrown errors.
        identify: (e) => e instanceof Error,
    },
    // Validate messages and options.
    valid: {
        // If false disables all validation.
        active: true,
        // Validate message parameters.
        message: true,
        // Validate main Seneca instance options.
        option: true,
        // Validate plugin options.
        plugin: true,
    },
    // Debug settings.
    debug: {
        // Throw (some) errors from seneca.act.
        fragile: false,
        // Fatal errors ... aren't fatal. Not for production!
        undead: false,
        // Print debug info to console
        print: {
            // Print options. Best used via --seneca.print.options.
            options: false,
            // Amount of information to print on fatal error: 'summary', 'full'
            fatal: 'summary',
            // Include environment when printing full crash report.
            // Default: false for security.
            env: false,
            // Regardless of logging, call `console.err` on errors
            err: false,
            // Depth of object inspection
            depth: 2,
        },
        // Trace action caller and place in args.caller$.
        act_caller: false,
        // Shorten all identifiers to 2 characters.
        short_logs: false,
        // Record and log callpoints (calling code locations).
        callpoint: false,
        // Log deprecation warnings
        deprecation: true,
        // Set to array to force artificial argv and ignore process.argv
        argv: One([], null),
        // Set to object to force artificial env and ignore process.env
        env: One({}, null),
        // Length of data description in logs
        datalen: 333,
    },
    // Keep secrets out of log entries (including the log event), error
    // details, printed options and fatal error reports. A value is
    // replaced by the mark when its key name looks secret, by the words of
    // the name (see lib/redact: password, secret, token, apikey, auth and
    // others), or matches one of `keys`. Passwords in URLs
    // (scheme://user:pass@host) are replaced too. Error message text never
    // contains message values.
    redact: {
        // Set false to switch redaction off (for local debugging only).
        active: true,
        // Additional names to redact, matched by words.
        keys: [String],
        // Replacement text.
        mark: '[REDACTED]',
    },
    // Enforce strict behaviours. Relax when backwards compatibility needed.
    strict: {
        // Action result must be a plain object.
        result: true,
        // Delegate fixedargs override action args.
        fixedargs: true,
        // Adding a pattern overrides existing pattern only if matches exactly.
        add: false,
        // If no action is found and find is false,
        // then no error returned along with empty object
        find: true,
        // Maximum number of times an action can call itself
        maxloop: 11,
        // Exports must exist
        exports: false,
    },
    // Keep a transient time-ordered history of actions submitted
    history: {
        // History log is active.
        active: true,
        // Prune the history. Disable only for debugging.
        prune: true,
        // Prune the history only periodically.
        interval: 100,
    },
    // Action executor tracing. See gate-executor module.
    trace: {
        act: One(Function, false),
        stack: false,
        // Messages that do not match a known pattern
        unknown: One(String, true),
        // Messages that have invalid content
        invalid: false,
    },
    // Action statistics settings. See rolling-stats module.
    stats: {
        size: 1024,
        interval: 60000,
        running: false,
    },
    // Plugin settings
    plugin: {},
    // Plugins to load (will be passed to .use)
    plugins: One({}, [], null),
    // System wide functionality.
    system: {
        // Function to exit the process. Called with the exit code after a
        // fatal error has been handled and the instance has been closed.
        exit: (code) => process.exit(code),
        // Close instance on these signals, if true.
        close_signals: {
            SIGHUP: false,
            SIGTERM: false,
            SIGINT: false,
            SIGBREAK: false,
        },
        plugin: {
            load_once: false,
        },
        // System actions.
        action: {
            // Add system actions.
            add: true
        },
    },
    // Internal functionality. Reserved for objects and functions only.
    internal: Open({
        // Console printing utilities
        print: {
            // Print to standard out
            log: One(Function, null),
            // Print to standard err
            err: One(Function, null),
        },
    }),
    // Log status at periodic intervals.
    status: {
        interval: 60000,
        // By default, does not run.
        running: false,
    },
    // Shared default transport configuration
    transport: Open({
        // Standard port for messages.
        port: 10101,
        host: Skip(String),
        path: Skip(String),
        protocol: Skip(String),
    }),
    limits: {
        maxparents: 33,
    },
    // Setup event listeners before starting
    events: {},
    // Backwards compatibility settings.
    legacy: One(Boolean, {
        // 3.x
        // Use old error handling.
        error: false,
        // Add meta$ property to messages.
        meta: false,
        // 4.x
        // If true, add role:seneca variants of builtin actions.
        builtin_actions: false,
        // Removed in Seneca 4. Accepted and ignored, with a deprecation
        // warning, so that Seneca 3 configurations load.
        actdef: Skip(Boolean),
        action_signature: Skip(Boolean),
        error_codes: Skip(Boolean),
        fail: Skip(Boolean),
        logging: Skip(Boolean),
        meta_arg_remove: Skip(Boolean),
        options: Skip(Boolean),
        rules: Skip(Boolean),
        timeout_string: Skip(Boolean),
        top_plugins: Skip(Boolean),
        transport: Skip(Boolean),
    }),
    // Processing task ordering.
    order: {
        // Action add task ordering.
        add: {
            // Print task execution log.
            debug: false,
        },
        // Action inward task ordering.
        inward: {
            // Print task execution log.
            debug: false,
        },
        // Action outward task ordering.
        outward: {
            // Print task execution log.
            debug: false,
        },
        // Plugin load task ordering.
        use: {
            // Print task execution log.
            debug: false,
        },
    },
    // Prior actions.
    prior: {
        // Call prior actions directly (not as further messages).
        direct: false,
    },
    // Legacy
    reload$: Skip(Boolean),
    // actcache: Any(),
    // seneca: Any(),
};
// Seneca 3 legacy flags that Seneca 4 removed. They are accepted (see the
// legacy option) and ignored, with a deprecation warning.
const REMOVED_LEGACY_FLAGS = [
    'actdef',
    'action_signature',
    'error_codes',
    'fail',
    'logging',
    'meta_arg_remove',
    'options',
    'rules',
    'timeout_string',
    'top_plugins',
    'transport',
];
// Utility functions exposed by Seneca via `seneca.util`.
const seneca_util = {
    Eraro: eraro_1.default,
    Jsonic: jsonic_1.default,
    Nid: nid_1.default,
    Patrun: patrun_1.Patrun,
    Gex: patrun_1.Gex,
    Shape: shape_1.Shape,
    pins: Common.pins,
    clean: Common.clean,
    pattern: Common.pattern,
    print: Common.print,
    error: error,
    deep: Common.deep,
    pincanon: Common.pincanon,
    router: function router() {
        return (0, patrun_1.Patrun)();
    },
    resolve_option: Common.resolve_option,
    // Deprecated. Remove in Seneca 5.
    deepextend: deprecate_1.Deprecate.deprecated('util_deepextend', Common.deep),
    flatten: deprecate_1.Deprecate.deprecated('util_flatten', legacy_1.Legacy.flatten),
};
// Deprecated alias of Shape. Remove in Seneca 5.
Object.defineProperty(seneca_util, 'Gubu', {
    get() {
        deprecate_1.Deprecate.deprecate(null, 'util_gubu');
        return shape_1.Shape;
    },
    enumerable: false,
});
// Internal implementations.
const intern = {
    util: seneca_util,
};
// The constructor of Seneca instances, which are EventEmitters. Exposed as
// Seneca.Seneca for monkey-patching the prototype.
function SenecaInstance() {
    events_1.default.EventEmitter.call(this);
    this.setMaxListeners(0);
}
util_1.default.inherits(SenecaInstance, events_1.default.EventEmitter);
// The known, valid Seneca event names. Anything else passed to `.on`
// is almost certainly a typo... (e.g. 'act-err' vs 'act_err'), so it's
// validated here rather than silently registering a listener that
// will never fire. See lib/act.ts, lib/outward.ts, lib/logging.ts,
// lib/ready.ts, lib/actions.ts (where these are emitted), and the
// close cleanup in lib/api.ts (where they are removed) for the
// canonical list.
const valid_event_names = [
    'act-in',
    'act-out',
    'act-err',
    'act-err-4',
    'pin',
    'after-pin',
    'ready',
    'close',
    'log',
    'error', // Node.js EventEmitter special-cases this event.
    'newListener', // Emitted by EventEmitter itself; used by events.once().
    'removeListener',
];
const original_on = SenecaInstance.prototype.on;
SenecaInstance.prototype.on = function (event_name, ...rest) {
    if ('string' === typeof event_name && -1 === valid_event_names.indexOf(event_name)) {
        throw error('invalid_event_name', {
            name: event_name,
            valid: valid_event_names.join(', '),
        });
    }
    if ('act-err-4' === event_name) {
        deprecate_1.Deprecate.deprecate(this, 'act_err_4');
    }
    return original_on.call(this, event_name, ...rest);
};
// Mark the Seneca object
SenecaInstance.prototype.isSeneca = true;
// Provide useful description when convered to JSON.
// Cannot be instantiated from JSON.
SenecaInstance.prototype.toJSON = function toJSON() {
    return {
        isSeneca: true,
        id: this.id,
        did: this.did,
        fixedargs: this.fixedargs,
        fixedmeta: this.fixedmeta,
        start_time: this.start_time,
        version: this.version,
    };
};
SenecaInstance.prototype[util_1.default.inspect.custom] = SenecaInstance.prototype.toJSON;
// Create a Seneca instance.
function Seneca(seneca_options, more_options) {
    var initial_opts = 'string' === typeof seneca_options
        ? deep({}, { from: seneca_options }, more_options)
        : deep({}, seneca_options, more_options);
    // Deprecated: deathdelay is an alias of death_delay.
    const used_deathdelay = undefined !== initial_opts.deathdelay;
    if (used_deathdelay && undefined === initial_opts.death_delay) {
        initial_opts.death_delay = initial_opts.deathdelay;
    }
    initial_opts.deathdelay = initial_opts.death_delay;
    var seneca = make_seneca(initial_opts);
    var options = seneca.options();
    if (used_deathdelay) {
        deprecate_1.Deprecate.deprecate(seneca, 'deathdelay');
    }
    // Deprecated: legacy flags that Seneca 4 ignores.
    const initial_legacy = initial_opts.legacy;
    if (null != initial_legacy && 'object' === typeof initial_legacy) {
        if (undefined !== initial_legacy.error) {
            deprecate_1.Deprecate.deprecate(seneca, 'legacy_error');
        }
        for (const flag of REMOVED_LEGACY_FLAGS) {
            if (undefined !== initial_legacy[flag]) {
                deprecate_1.Deprecate.deprecate(seneca, 'legacy_flag', { flag }, 'legacy_flag:' + flag);
            }
        }
    }
    // The 'internal' key of options is reserved for objects and functions
    // that provide functionality, and are thus not really printable
    seneca.log.debug({ kind: 'notice', options: { ...options, internal: null } });
    print_1.Print.print_options(seneca, options);
    // Register plugins specified in options.
    options.plugins = null == options.plugins ? {} : options.plugins;
    var pluginkeys = Object.keys(options.plugins);
    for (var pkI = 0; pkI < pluginkeys.length; pkI++) {
        var pluginkey = pluginkeys[pkI];
        var plugindesc = options.plugins[pluginkey];
        if (false === plugindesc) {
            seneca.private$.ignore_plugins[pluginkey] = true;
        }
        else {
            seneca.use(plugindesc);
        }
    }
    seneca.ready(function () {
        this.log.info({ kind: 'notice', data: 'hello ' + this.id });
    });
    return seneca;
}
// Expose Seneca prototype for easier monkey-patching
Seneca.Seneca = SenecaInstance;
// Makes require('seneca').use(...) work by creating an on-the-fly instance.
Seneca.use = function top_use(...args) {
    return Seneca().use(...args);
};
// Makes require('seneca').test() work.
Seneca.test = function top_test(...args) {
    return Seneca().test(...args);
};
// Makes require('seneca').quiet() work.
Seneca.quiet = function top_quiet(...args) {
    return Seneca().quiet(...args);
};
Seneca.util = seneca_util;
Seneca.valid = shape_1.Shape;
// Internals for Seneca's own tests; not part of the public API.
Seneca.test$ = { intern: intern };
// Create a new Seneca instance.
function make_seneca(initial_opts) {
    // Create a private context.
    var private$ = make_private();
    private$.error = error;
    // Create a new root Seneca instance.
    var root$ = new SenecaInstance();
    // Expose private data to plugins.
    root$.private$ = private$;
    // Deprecations reached without an instance (Seneca.util) report here.
    deprecate_1.Deprecate.track(root$);
    // Resolve initial options.
    private$.optioner = (0, options_1.resolve_options)(module, option_defaults, initial_opts);
    var start_opts = private$.optioner.get();
    // Redacts secrets from data leaving the instance (see lib/redact).
    private$.redact = (0, redact_1.make_redactor)(start_opts.redact);
    // Console print utilities
    private$.print = {
        log: start_opts.internal.print.log || print_1.Print.internal_log,
        err: start_opts.internal.print.err || print_1.Print.internal_err,
    };
    // These need to come from options as required during construction.
    private$.actrouter = start_opts.internal.actrouter || (0, patrun_1.Patrun)({ gex: true });
    private$.translationrouter =
        start_opts.internal.translationrouter || (0, patrun_1.Patrun)({ gex: true });
    const soi_subrouter = start_opts.internal.subrouter || {};
    private$.subrouter = {
        // Check for legacy inward router
        inward: soi_subrouter.inward || (0, patrun_1.Patrun)({ gex: true }),
        outward: soi_subrouter.outward || (0, patrun_1.Patrun)({ gex: true }),
    };
    // Setup event handlers, if defined
    var event_names = ['log', 'act-in', 'act-out', 'act-err', 'ready', 'close'];
    event_names.forEach(function (event_name) {
        if ('function' === typeof start_opts.events[event_name]) {
            root$.on(event_name, start_opts.events[event_name]);
        }
    });
    // Create internal tools.
    private$.actnid = Common.idnid({ length: start_opts.idlen });
    private$.didnid = Common.idnid({ length: start_opts.didlen });
    // Instance specific incrementing counters to create unique function names
    private$.next_action_id = Common.autoincr();
    var callpoint = (private$.callpoint = Common.make_callpoint(start_opts.debug.callpoint));
    // Define public member variables.
    root$.start_time = Date.now();
    root$.context = {};
    root$.version = package_json_1.default.version;
    // TODO: rename in 4.x as "args" terminology is legacy
    root$.fixedargs = {};
    root$.fixedmeta = {};
    root$.flags = {
        closed: false,
    };
    // Deprecated alias of flags.closed. Remove in Seneca 5.
    Object.defineProperty(root$, 'closed', {
        get() {
            deprecate_1.Deprecate.deprecate(this, 'closed');
            return this.flags.closed;
        },
        enumerable: false,
        configurable: true,
    });
    Object.defineProperty(root$, 'root', { value: root$ });
    private$.history = Common.history(start_opts.history);
    const ready = (0, ready_1.make_ready)(root$);
    // API for Ordu-defined processes.
    root$.order = {};
    // TODO: rename back to plugins
    const api_use = plugin_1.Plugin.api_use(callpoint, {
        debug: !!start_opts.debug.ordu || !!start_opts.order.use.debug,
    });
    root$.use = api_use.use; // Define and load a plugin.
    root$.order.plugin = api_use.ordu;
    // Seneca methods. Official API.
    root$.toString = api_1.API.toString;
    root$.has = api_1.API.has; // True if the given pattern has an action.
    root$.find = api_1.API.find; // Find the action definition for a pattern.
    root$.list = api_1.API.list; // List the patterns added to this instance.
    root$.status = api_1.API.status; // Get the status if this instance.
    root$.reply = api_1.API.reply; // Reply to a submitted message.
    root$.sub = Sub.api_sub; // Subscribe to messages.
    root$.list_plugins = api_1.API.list_plugins; // List the registered plugins.
    root$.find_plugin = api_1.API.find_plugin; // Find the plugin definition.
    root$.has_plugin = api_1.API.has_plugin; // True if the plugin is registered.
    root$.ignore_plugin = api_1.API.ignore_plugin; // Ignore plugin and don't register it.
    root$.listen = api_1.API.listen(callpoint); // Listen for inbound messages.
    root$.client = api_1.API.client(callpoint); // Send outbound messages.
    root$.gate = api_1.API.gate; // Create a delegate that executes actions in sequence.
    root$.ungate = api_1.API.ungate; // Execute actions in parallel.
    root$.translate = api_1.API.translate; // Translate message to new pattern.
    root$.ping = api_1.API.ping; // Generate ping response.
    root$.test = api_1.API.test; // Set test mode.
    root$.quiet = api_1.API.quiet; // Convenience method to set logging level to `warn+`.
    root$.export = api_1.API.export; // Export plain objects from a plugin.
    root$.depends = api_1.API.depends; // Check for plugin dependencies.
    root$.delegate = api_1.API.delegate; // Create an action-specific Seneca instance.
    root$.prior = prior_1.Prior.api_prior; // Call the previous action definition for pattern.
    root$.direct_prior = prior_1.Prior.api_direct_prior; // Call the previous action definition synchronously.
    root$.inward = api_1.API.inward; // Add a modifier function for messages inward
    root$.outward = api_1.API.outward; // Add a modifier function for responses outward
    root$.error = api_1.API.error; // Set global error handler, or generate Seneca Error
    root$.fail = api_1.API.fail; // Throw a Seneca error
    root$.explain = api_1.API.explain; // Toggle top level explain capture
    root$.decorate = api_1.API.decorate; // Decorate seneca object with functions
    root$.seneca = api_1.API.seneca;
    root$.close = api_1.API.close(callpoint); // Close and shutdown plugins.
    root$.options = api_1.API.options; // Get and set options.
    root$.fix = api_1.API.fix; // fix pattern arguments, message arguments, and custom meta
    root$.wrap = api_1.API.wrap; // wrap each found pattern with a new action
    root$.add = Add.api_add; // Add a pattern and associated action.
    root$.message = Add.api_message; // Add a pattern and associated action async function.
    root$.act = Act.api_act; // Submit a message and trigger the associated action.
    root$.post = util_1.default.promisify(root$.act); // Async version of act.
    root$.direct = Act.api_direct; // Run message action synchronously.
    root$.ready = ready.api_ready; // Callback when plugins initialized.
    root$.valid = shape_1.Shape; // Expose the Shape builders
    root$.prepare = api_1.API.prepare; // Plugin preparation action.
    root$.destroy = api_1.API.destroy; // Close Seneca instance.
    root$.internal = function () {
        return {
            ordu: {
                use: api_use.ordu,
            },
        };
    };
    // Non-API methods.
    // root$.register = Plugins.register(callpoint)
    // Deprecated aliases. Remove in Seneca 5.
    root$.findact = deprecate_1.Deprecate.deprecated('findact', root$.find);
    root$.plugins = deprecate_1.Deprecate.deprecated('plugins', api_1.API.list_plugins);
    root$.findplugin = deprecate_1.Deprecate.deprecated('findplugin', api_1.API.find_plugin);
    root$.hasplugin = deprecate_1.Deprecate.deprecated('hasplugin', api_1.API.has_plugin);
    root$.hasact = deprecate_1.Deprecate.deprecated('hasact', legacy_1.Legacy.hasact);
    root$.act_if = deprecate_1.Deprecate.deprecated('act_if', legacy_1.Legacy.act_if);
    root$.findpins = deprecate_1.Deprecate.deprecated('findpins', legacy_1.Legacy.findpins);
    root$.pinact = deprecate_1.Deprecate.deprecated('pinact', legacy_1.Legacy.findpins);
    // Identifier generator.
    root$.idgen = Common.idnid({ length: start_opts.idlen });
    // Instance tag
    start_opts.tag = null != start_opts.tag ? start_opts.tag : option_defaults.tag;
    // Create a unique identifer for this instance.
    root$.id =
        start_opts.id$ ||
            root$.idgen() +
                '/' +
                root$.start_time +
                '/' +
                process.pid +
                '/' +
                root$.version +
                '/' +
                start_opts.tag;
    // The instance tag, useful for grouping instances.
    root$.tag = start_opts.tag;
    if (start_opts.debug.short_logs || start_opts.log.short) {
        start_opts.idlen = 2;
        root$.idgen = Common.idnid({ length: start_opts.idlen });
        root$.id = root$.idgen() + '/' + start_opts.tag;
    }
    root$.fullname = 'Seneca/' + root$.id;
    root$.die = Common.makedie(root$, {
        type: 'sys',
        plugin: 'seneca',
        tag: root$.version,
        id: root$.id,
        callpoint: callpoint,
    });
    root$.util = seneca_util;
    private$.exports = { options: start_opts };
    private$.decorations = {};
    // Error events are fatal, unless you're undead.  These are not the
    // same as action errors, these are unexpected internal issues.
    root$.on('error', root$.die);
    private$.ge = (0, gate_executor_1.default)({
        timeout: start_opts.timeout,
    })
        //.clear(action_queue_clear)
        .clear(ready.clear_ready)
        .start();
    // TODO: this should be a plugin
    // setup status log
    if (start_opts.status.interval > 0 && start_opts.status.running) {
        private$.stats = private$.stats || {};
        private$.status_interval = setInterval(function status() {
            root$.log.info({
                kind: 'status',
                alive: Date.now() - private$.stats.start,
                act: private$.stats.act,
            });
        }, start_opts.status.interval);
    }
    if (start_opts.stats) {
        // rolling-stats declares the clock argument as required; it defaults to
        // Date.now.
        private$.timestats = rolling_stats_1.default.NamedStats(start_opts.stats.size, start_opts.stats.interval);
        if (start_opts.stats.running) {
            setInterval(function stats() {
                private$.timestats.calculate();
            }, start_opts.stats.interval);
        }
    }
    // private$.plugins = {}
    private$.plugin_order = { byname: [], byref: [] };
    private$.use = UsePlugin({
        prefix: ['seneca-', '@seneca/'],
        module: start_opts.internal.module || module,
        msgprefix: false,
        builtin: '',
        merge_defaults: false,
    });
    // TODO: provide an api to add these
    private$.action_modifiers = [
        function add_rules_from_validate_annotation(actdef) {
            actdef.rules = Object.assign(actdef.rules, deep({}, actdef.func.validate || {}));
        },
    ];
    private$.sub = { handler: null, tracers: [] };
    root$.order.add = new ordu_1.Ordu({
        name: 'add',
        debug: !!start_opts.debug.ordu || !!start_opts.order.add.debug,
    })
        .add(Add.task.translate)
        .add(Add.task.prepare)
        .add(Add.task.plugin)
        .add(Add.task.callpoint)
        .add(Add.task.flags)
        .add(Add.task.action)
        .add(Add.task.prior)
        .add(Add.task.rules)
        .add(Add.task.register)
        .add(Add.task.modify);
    root$.order.inward = new ordu_1.Ordu({
        name: 'inward',
        debug: !!start_opts.debug.ordu || !!start_opts.order.inward.debug,
    })
        .add(inward_1.Inward.inward_msg_modify)
        .add(inward_1.Inward.inward_closed)
        .add(inward_1.Inward.inward_act_cache)
        .add(inward_1.Inward.inward_act_default)
        .add(inward_1.Inward.inward_act_not_found)
        .add(inward_1.Inward.inward_act_stats)
        .add(inward_1.Inward.inward_validate_msg)
        .add(inward_1.Inward.inward_warnings)
        .add(inward_1.Inward.inward_msg_meta)
        .add(inward_1.Inward.inward_limit_msg)
        .add(inward_1.Inward.inward_prepare_delegate)
        .add(inward_1.Inward.inward_sub)
        .add(inward_1.Inward.inward_announce);
    root$.order.outward = new ordu_1.Ordu({
        name: 'outward',
        debug: !!start_opts.debug.ordu || !!start_opts.order.outward.debug,
    })
        .add(outward_1.Outward.outward_make_error)
        .add(outward_1.Outward.outward_act_stats)
        .add(outward_1.Outward.outward_act_cache)
        .add(outward_1.Outward.outward_res_object)
        .add(outward_1.Outward.outward_res_entity)
        .add(outward_1.Outward.outward_msg_meta)
        .add(outward_1.Outward.outward_trace)
        .add(outward_1.Outward.outward_sub)
        .add(outward_1.Outward.outward_announce)
        .add(outward_1.Outward.outward_act_error);
    // Configure logging
    // Mark logger as being externally defined from options
    if (start_opts.logger && 'object' === typeof start_opts.logger) {
        start_opts.logger.from_options$ = true;
    }
    // Load logger and update log options
    var logspec = private$.logging.build_log(root$);
    start_opts = private$.exports.options = private$.optioner.set({
        log: logspec,
    });
    if (start_opts.test) {
        root$.test('string' === typeof start_opts.test ? start_opts.test : null);
    }
    if (start_opts.quiet) {
        root$.quiet();
    }
    private$.exit_close = function () {
        root$.close(function root_exit_close(err) {
            if (err && true != private$.optioner.get().quiet) {
                private$.print.err(err);
            }
            start_opts.system.exit(err ? (err.exit === null ? 1 : err.exit) : 0);
        });
    };
    if (start_opts.system.action.add) {
        (0, actions_1.addActions)(root$);
    }
    start_opts.legacy.error = false;
    // The shared transport configuration (option `transport`) only carries
    // the values the user set, plus the default port. Host, path and
    // protocol defaults belong to the transport plugin in use (for example
    // seneca-transport listens on 0.0.0.0, path /act, protocol http), as in
    // Seneca 3. Injecting HTTP defaults here broke TCP listeners, which read
    // `path` as a UNIX socket path.
    (0, transport_1.transport)(root$);
    (0, print_1.Print)(root$, start_opts.debug.argv || process.argv);
    Common.each(start_opts.system.close_signals, function (active, signal) {
        if (active) {
            process.once(signal, private$.exit_close);
        }
    });
    // Emit start message (also ensures GateExecutor will trigger 'ready' event)
    root$.act('sys:seneca,on:point,point:start');
    return root$;
}
// Private member variables of Seneca object.
function make_private() {
    return {
        logging: (0, logging_1.make_logging)(),
        stats: {
            start: Date.now(),
            act: {
                calls: 0,
                done: 0,
                fails: 0,
                cache: 0,
            },
            actmap: {},
        },
        actdef: {},
        transport: {
            register: [],
        },
        plugins: {
            // Virtual "plugin" for top level actions.
            root$: {
                name: 'root$',
                fullname: 'root$',
                tag: '-',
                options: Object.create(null),
                shared: Object.create(null),
            }
        },
        ignore_plugins: {},
        cleared: 0,
        // Keys used in action patterns (see lib/redact describe_msg).
        pattern_keys: new Set(),
    };
}
module.exports = Seneca;
//# sourceMappingURL=seneca.js.map