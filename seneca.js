/* Copyright © 2010-2022 Richard Rodger and other contributors, MIT License. */
'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
// Node API modules.
const Events = require('events');
const Util = require('util');
// External modules.
const GateExecutor = require('gate-executor');
const Jsonic = require('jsonic');
const UsePlugin = require('use-plugin');
const Nid = require('nid');
const Patrun = require('patrun');
const Stats = require('rolling-stats');
const { Ordu } = require('ordu');
const { Gubu, One, Any, Skip, Open } = require('gubu');
const Eraro = require('eraro');
// Deprecated Legacy modules.
const Optioner = require('optioner');
const Joi = require('@hapi/joi');
// Internal modules.
const Common = require('./lib/common');
const { make_logging } = require('./lib/logging');
const { API } = require('./lib/api');
const { make_ready } = require('./lib/ready');
const Act = require('./lib/act');
const Add = require('./lib/add');
const Sub = require('./lib/sub');
const prior_1 = require("./lib/prior");
const plugin_1 = require("./lib/plugin");
const { Inward } = require('./lib/inward');
const { Outward } = require('./lib/outward');
const { Legacy } = require('./lib/legacy');
const { resolve_options } = require('./lib/options');
const Package = require('./package.json');
const { Print } = require('./lib/print');
const { addActions } = require('./lib/actions');
const { transport } = require('./lib/transport');
// Internal data and utilities.
const { error, deep } = Common;
// Seneca options.
const option_defaults = {
    // Tag this Seneca instance, will be appended to instance identifier.
    tag: '-',
    // Standard timeout for actions.
    timeout: 22222,
    // Standard length of identifiers for actions.
    idlen: 12,
    didlen: 4,
    // Manually set instance identifier.
    id$: Skip(String),
    // Register (true) default plugins. Set false to not register when
    // using custom versions.
    default_plugins: Open({
        transport: true,
    }),
    // Test mode. Use for unit testing.
    test: false,
    // Quiet mode. Moves log level to warn. Use for unit testing.
    quiet: false,
    // Default logging specification - see lib/logging.js
    log: Any(make_logging().default_logspec),
    // Custom logger function, optional - see lib/logging.js
    logger: One(Function, Object, String, null),
    // Wait time for plugins to close gracefully.
    death_delay: 11111,
    // LEGACY: remove in 4.x
    deathdelay: 11111,
    // Wait time for actions to complete before shutdown.
    close_delay: 22222,
    // Legacy; specify general error handler
    errhandler: Skip(One(Function, null)),
    // Load options from a file path
    from: Skip(String),
    // Provide a module to base option require loading from
    module: Skip(),
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
        datalen: 111,
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
        // TODO: use Func shape
        // Function to exit the process.
        exit: () => process.exit,
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
        // Add legacy properties
        actdef: false,
        // Action callback must always have signature callback(error, result).
        action_signature: false,
        // Use old error handling.
        error: true,
        // Use old error codes. REMOVE in Seneca 4.x
        error_codes: false,
        // Use old fail method
        fail: false,
        // Logger can be changed by options method.
        logging: false,
        // Add meta$ property to messages.
        meta: false,
        // Remove meta argument in action arguments and callbacks.
        meta_arg_remove: false,
        // Use seneca-transport plugin.
        transport: true,
        // Insert "[TIMEOUT]" into timeout error message
        timeout_string: true,
        // If false, use Gubu for message validation.
        rules: false,
        // If false, use Gubu for option validation (including plugin defaults)
        options: true,
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
};
// Utility functions exposed by Seneca via `seneca.util`.
const seneca_util = {
    Eraro: Eraro,
    Jsonic: Jsonic,
    Nid: Nid,
    Patrun: Patrun,
    clean: Common.clean,
    pattern: Common.pattern,
    print: Common.print,
    error: error,
    deep: Common.deep,
    // TODO: expose directly for better DX - no need to namespace under gubu
    // Expose Gubu schema builders (Required, etc.).
    Gubu,
    // Deprecated Legacy (make internal or rename)
    Optioner: Optioner,
    Joi: Joi,
    deepextend: Common.deep,
    parsepattern: Common.parsePattern,
    pincanon: Common.pincanon,
    router: function router() {
        return Patrun();
    },
    resolve_option: Common.resolve_option,
    // Legacy (deprecate and remove)
    argprops: Legacy.argprops,
    recurse: Legacy.recurse,
    copydata: Legacy.copydata,
    nil: Legacy.nil,
    flatten: Legacy.flatten,
};
// Internal implementations.
const intern = {
    util: seneca_util,
};
// Seneca is an EventEmitter.
function Seneca() {
    Events.EventEmitter.call(this);
    this.setMaxListeners(0);
}
Util.inherits(Seneca, Events.EventEmitter);
// Mark the Seneca object
Seneca.prototype.isSeneca = true;
// Provide useful description when convered to JSON.
// Cannot be instantiated from JSON.
Seneca.prototype.toJSON = function toJSON() {
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
Seneca.prototype[Util.inspect.custom] = Seneca.prototype.toJSON;
// Create a Seneca instance.
module.exports = function init(seneca_options, more_options) {
    var initial_opts = 'string' === typeof seneca_options
        ? deep({}, { from: seneca_options }, more_options)
        : deep({}, seneca_options, more_options);
    // Legacy options, remove in 4.x
    initial_opts.deathdelay = initial_opts.death_delay;
    var seneca = make_seneca(initial_opts);
    var options = seneca.options();
    // The 'internal' key of options is reserved for objects and functions
    // that provide functionality, and are thus not really printable
    seneca.log.debug({ kind: 'notice', options: { ...options, internal: null } });
    Print.print_options(seneca, options);
    // Register default plugins, unless turned off by options.
    if (options.legacy.transport && options.default_plugins.transport) {
        seneca.use(require('seneca-transport'));
    }
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
};
// Expose Seneca prototype for easier monkey-patching
module.exports.Seneca = Seneca;
// To reference builtin loggers when defining logging options.
module.exports.loghandler = Legacy.loghandler;
// Makes require('seneca').use(...) work by creating an on-the-fly instance.
module.exports.use = function top_use() {
    var argsarr = new Array(arguments.length);
    for (var l = 0; l < argsarr.length; ++l) {
        argsarr[l] = arguments[l];
    }
    var instance = module.exports();
    return instance.use.apply(instance, argsarr);
};
// Makes require('seneca').test() work.
module.exports.test = function top_test() {
    return module.exports().test(...arguments);
};
// Makes require('seneca').quiet() work.
module.exports.quiet = function top_quiet() {
    return module.exports().quiet(...arguments);
};
module.exports.util = seneca_util;
module.exports.valid = Gubu;
module.exports.test$ = { intern: intern };
// Create a new Seneca instance.
function make_seneca(initial_opts) {
    // Create a private context.
    var private$ = make_private();
    private$.error = error;
    // Create a new root Seneca instance.
    var root$ = new Seneca();
    // Expose private data to plugins.
    root$.private$ = private$;
    // Resolve initial options.
    private$.optioner = resolve_options(module, option_defaults, initial_opts);
    var start_opts = private$.optioner.get();
    // Console print utilities
    private$.print = {
        log: start_opts.internal.print.log || Print.internal_log,
        err: start_opts.internal.print.err || Print.internal_err,
    };
    // These need to come from options as required during construction.
    private$.actrouter = start_opts.internal.actrouter || Patrun({ gex: true });
    var soi_subrouter = start_opts.internal.subrouter || {};
    private$.subrouter = {
        // Check for legacy inward router
        inward: soi_subrouter.inward || Patrun({ gex: true }),
        outward: soi_subrouter.outward || Patrun({ gex: true }),
    };
    // Setup event handlers, if defined
    var event_names = ['log', 'act_in', 'act_out', 'act_err', 'ready', 'close'];
    event_names.forEach(function (event_name) {
        if ('function' === typeof start_opts.events[event_name]) {
            root$.on(event_name, start_opts.events[event_name]);
        }
    });
    // Create internal tools.
    private$.actnid = Nid({ length: start_opts.idlen });
    private$.didnid = Nid({ length: start_opts.didlen });
    // Instance specific incrementing counters to create unique function names
    private$.next_action_id = Common.autoincr();
    var callpoint = (private$.callpoint = Common.make_callpoint(start_opts.debug.callpoint));
    // Define public member variables.
    root$.start_time = Date.now();
    root$.context = {};
    root$.version = Package.version;
    // TODO: rename in 4.x as "args" terminology is legacy
    root$.fixedargs = {};
    root$.flags = {
        closed: false,
    };
    Object.defineProperty(root$, 'root', { value: root$ });
    private$.history = Common.history(start_opts.history);
    const ready = make_ready(root$);
    // API for Ordu-defined processes.
    root$.order = {};
    // TODO: rename back to plugins
    const api_use = plugin_1.Plugin.api_use(callpoint, {
        debug: !!start_opts.debug.ordu || !!start_opts.order.use.debug,
    });
    root$.use = api_use.use; // Define and load a plugin.
    root$.order.plugin = api_use.ordu;
    // Seneca methods. Official API.
    root$.toString = API.toString;
    root$.has = API.has; // True if the given pattern has an action.
    root$.find = API.find; // Find the action definition for a pattern.
    root$.list = API.list; // List the patterns added to this instance.
    root$.status = API.status; // Get the status if this instance.
    root$.reply = API.reply; // Reply to a submitted message.
    root$.sub = Sub.api_sub; // Subscribe to messages.
    root$.list_plugins = API.list_plugins; // List the registered plugins.
    root$.find_plugin = API.find_plugin; // Find the plugin definition.
    root$.has_plugin = API.has_plugin; // True if the plugin is registered.
    root$.ignore_plugin = API.ignore_plugin; // Ignore plugin and don't register it.
    root$.listen = API.listen(callpoint); // Listen for inbound messages.
    root$.client = API.client(callpoint); // Send outbound messages.
    root$.gate = API.gate; // Create a delegate that executes actions in sequence.
    root$.ungate = API.ungate; // Execute actions in parallel.
    root$.translate = API.translate; // Translate message to new pattern.
    root$.ping = API.ping; // Generate ping response.
    root$.test = API.test; // Set test mode.
    root$.quiet = API.quiet; // Convenience method to set logging level to `warn+`.
    root$.export = API.export; // Export plain objects from a plugin.
    root$.depends = API.depends; // Check for plugin dependencies.
    root$.delegate = API.delegate; // Create an action-specific Seneca instance.
    root$.prior = prior_1.Prior.api_prior; // Call the previous action definition for pattern.
    root$.inward = API.inward; // Add a modifier function for messages inward
    root$.outward = API.outward; // Add a modifier function for responses outward
    root$.error = API.error; // Set global error handler, or generate Seneca Error
    root$.fail = start_opts.legacy.fail
        ? Legacy.make_legacy_fail(start_opts)
        : API.fail; // Throw a Seneca error
    root$.explain = API.explain; // Toggle top level explain capture
    root$.decorate = API.decorate; // Decorate seneca object with functions
    root$.seneca = API.seneca;
    root$.close = API.close(callpoint); // Close and shutdown plugins.
    root$.options = API.options; // Get and set options.
    root$.fix = API.fix; // fix pattern arguments, message arguments, and custom meta
    root$.wrap = API.wrap; // wrap each found pattern with a new action
    root$.add = Add.api_add; // Add a pattern an associated action.
    root$.act = Act.api_act; // Submit a message and trigger the associated action.
    root$.ready = ready.api_ready; // Callback when plugins initialized.
    root$.valid = Gubu; // Expose Gubu shape builders
    root$.internal = function () {
        return {
            ordu: {
                use: api_use.ordu,
            },
        };
    };
    // Non-API methods.
    // root$.register = Plugins.register(callpoint)
    // DEPRECATE IN 4.x
    root$.findact = root$.find;
    root$.plugins = API.list_plugins;
    root$.findplugin = API.find_plugin;
    root$.hasplugin = API.has_plugin;
    root$.hasact = Legacy.hasact;
    root$.act_if = Legacy.act_if;
    root$.findpins = Legacy.findpins;
    root$.pinact = Legacy.findpins;
    root$.next_act = Legacy.next_act;
    // Identifier generator.
    root$.idgen = Nid({ length: start_opts.idlen });
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
        root$.idgen = Nid({ length: start_opts.idlen });
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
    private$.ge = GateExecutor({
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
        private$.timestats = new Stats.NamedStats(start_opts.stats.size, start_opts.stats.interval);
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
    root$.order.add = new Ordu({
        name: 'add',
        debug: !!start_opts.debug.ordu || !!start_opts.order.add.debug,
    })
        .add(Add.task.prepare)
        .add(Add.task.plugin)
        .add(Add.task.callpoint)
        .add(Add.task.flags)
        .add(Add.task.action)
        .add(Add.task.prior)
        .add(Add.task.rules)
        .add(Add.task.register)
        .add(Add.task.modify);
    root$.order.inward = new Ordu({
        name: 'inward',
        debug: !!start_opts.debug.ordu || !!start_opts.order.inward.debug,
    })
        .add(Inward.inward_msg_modify)
        .add(Inward.inward_closed)
        .add(Inward.inward_act_cache)
        .add(Inward.inward_act_default)
        .add(Inward.inward_act_not_found)
        .add(Inward.inward_act_stats)
        .add(Inward.inward_validate_msg)
        .add(Inward.inward_warnings)
        .add(Inward.inward_msg_meta)
        .add(Inward.inward_limit_msg)
        .add(Inward.inward_prepare_delegate)
        .add(Inward.inward_sub)
        .add(Inward.inward_announce);
    root$.order.outward = new Ordu({
        name: 'outward',
        debug: !!start_opts.debug.ordu || !!start_opts.order.outward.debug,
    })
        .add(Outward.outward_make_error)
        .add(Outward.outward_act_stats)
        .add(Outward.outward_act_cache)
        .add(Outward.outward_res_object)
        .add(Outward.outward_res_entity)
        .add(Outward.outward_msg_meta)
        .add(Outward.outward_trace)
        .add(Outward.outward_sub)
        .add(Outward.outward_announce)
        .add(Outward.outward_act_error);
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
    addActions(root$);
    // root$.act('role:seneca,cmd:pingx')
    if (!start_opts.legacy.transport) {
        start_opts.legacy.error = false;
        // TODO: move to static options in Seneca 4.x
        start_opts.transport = deep({
            port: 62345,
            host: '127.0.0.1',
            path: '/act',
            protocol: 'http',
        }, start_opts.transport);
        transport(root$);
    }
    Print(root$, start_opts.debug.argv || process.argv);
    Common.each(start_opts.system.close_signals, function (active, signal) {
        if (active) {
            process.once(signal, private$.exit_close);
        }
    });
    return root$;
}
// Private member variables of Seneca object.
function make_private() {
    return {
        logging: make_logging(),
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
    };
}
//# sourceMappingURL=seneca.js.map