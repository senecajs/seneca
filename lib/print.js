/* Copyright © 2015-2021 Richard Rodger and other contributors, MIT License. */
'use strict';
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Print = Print;
// Node API modules
const util_1 = __importDefault(require("util"));
// Untyped modules.
const Minimist = require('minimist');
/** Handle command line specific functionality */
function Print(seneca, process_argv) {
    var argv = Minimist(process_argv.slice(2));
    var cmdspec = argv.seneca;
    seneca.root.argv = cmdspec;
    if (!argv.seneca) {
        return;
    }
    if (cmdspec.print) {
        if (cmdspec.print.options) {
            seneca.options({ debug: { print: { options: true } } });
        }
    }
}
function print_options(instance, options) {
    if (options.debug.print.options) {
        instance.private$.print.log('\nSeneca Options (' + instance.id + '): before plugins\n' + '===\n');
        instance.private$.print.log(util_1.default.inspect(options, { depth: options.debug.print.depth }));
        instance.private$.print.log('');
    }
}
function print_reply(err, out) {
    if (err) {
        internal_err('ERROR: ' + err.message);
    }
    else {
        internal_log(util_1.default.inspect(out, {
            depth: this && this.options ? this.options().debug.print.depth : null,
        }));
    }
}
function internal_log(...args) {
    // ensure `console.log` does not appear in source code
    var konsole_log = console['log'];
    konsole_log.apply(konsole_log, args);
}
function internal_err(...args) {
    console.error.apply(console.error, args);
}
function plugin_options(instance, fullname, plugin_options) {
    instance.private$.print.log('\nSeneca Options (' +
        instance.id +
        '): plugin: ' +
        fullname +
        '\n' +
        '===\n');
    instance.private$.print.log(util_1.default.inspect(plugin_options, {
        depth: instance.options().debug.print.depth,
    }));
    instance.private$.print.log('');
}
Print.print_options = print_options;
Print.internal_log = internal_log;
Print.internal_err = internal_err;
Print.plugin_options = plugin_options;
Print.print = print_reply;
//# sourceMappingURL=print.js.map