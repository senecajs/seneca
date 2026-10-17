"use strict";
/* Copyright © 2010-2022 Richard Rodger and other contributors, MIT License. */
Object.defineProperty(exports, "__esModule", { value: true });
exports.deprecation = exports.messages = void 0;
// Error code messages.
const messages = {
    test_msg: 'Test message.',
    test_args: 'Test args <%=arg0%> <%=arg1%>.',
    test_prop: 'TESTING: exists: <%=exists%>, notfound:<%=notfound%>, str=<%=str%>,' +
        ' obj=<%=obj%>, arr=<%=arr%>, bool=<%=bool%>, null=<%=null$%>, delete=<%=delete$%>, undefined=<%=undefined$%>, void=<%=void$%>, NaN=<%=NaN$%>',
    add_string_pattern_syntax: 'Could not add action due to syntax error in ' +
        'pattern string: "<%=argstr%>": Line:<%=line%>, Column:<%=col%>; <%=syntax%>',
    act_string_args_syntax: 'Could execute action due to syntax error in argument' +
        ' string: "<%=argstr%>": Line:<%=line%>, Column:<%=col%>; <%=syntax%>',
    add_pattern_object_expected_after_string_pattern: 'Could not add action; ' +
        'unexpected argument; a pattern object or function should follow the pattern' +
        ' string; arguments were: "<%=args%>".',
    add_pattern_object_expected: 'Could not add action; unexpected argument; ' +
        'a pattern object or string should be the first argument; ' +
        'arguments were: "<%=args%>".',
    add_action_function_expected: 'Could not add action: the action function ' +
        'should appear after the pattern; arguments were: "<%=args%>".',
    add_action_metadata_not_an_object: 'Could not add action: the argument after ' +
        'the action function should be a metadata object: <%=actdef%>.',
    add_empty_pattern: 'Could not add action, as the action pattern is empty: ' + '"<%=args%>"',
    act_if_expects_boolean: 'The method act_if expects a boolean value as its ' +
        'first argument, was: "<%=first%>".',
    act_not_found: 'No matching action pattern found for <%=args%>, and no default ' +
        'result provided (using a default$ property).',
    act_default_bad: 'No matching action pattern found for <%=args%>, and default ' +
        'result is not a plain object or an array: <%=xdefault%>.',
    act_no_args: 'No action pattern defined in "<%=args%>"; the first argument ' +
        'should be a string or object pattern.',
    act_invalid_msg: 'Action <%=pattern%> received an invalid message; <%=message%>; ' +
        'message content was: <%=msg%>.',
    act_execute: 'Action <%=pattern%> failed: <%=message%>.',
    act_callback: 'Action <%=pattern%> callback threw: <%=message%>.',
    act_loop: 'Action <%=pattern%> loops back on itself. Action details: <%=actdef%>, history: <%=history%>',
    result_not_objarr: 'Action <%=pattern%> responded with result that was not an ' +
        'object or array: <%=result%>; Use option strict:{result:false} to allow; ' +
        'arguments were: <%=args%>',
    no_client: 'Transport client was not created; arguments were: "<%=args%>".',
    invalid_options: 'Invalid options; <%=message%>',
    plugin_required: 'The <%=name%> plugin depends on the <%=dependency%> plugin, ' +
        'which is not loaded yet.',
    plugin_init: 'The <%=name%> plugin failed to initialize: <%=plugin_error%>.',
    plugin_init_timeout: 'The <%=name%> plugin failed to initialize within ' +
        '<%=timeout%> milliseconds (The init:<%=name%> action did not call the "done"' +
        ' callback in time).',
    export_not_found: 'The export <%=key%> has not been defined by a plugin.',
    store_cmd_missing: 'Entity data store implementation is missing a command; ' +
        '"<%=cmd%>": "<%=store%>".',
    // TODO: remove
    // sub_function_catch:
    //   'Pattern subscription function threw: <%=message%> on ' +
    //   'message: <%=msg%>, result: <%=result%>.',
    sub_inward_action_failed: 'Subscription action on inward pattern <%=pattern%>' +
        ' threw: <%=errmsg%> at <%=errline%> on message data: <%=msg%>. ' +
        'To start debugging, find the `seneca.sub` method call that defines the subscription action, and review the code of the action function.',
    sub_outward_action_failed: 'Subscription action on outward pattern <%=pattern%>' +
        ' threw: <%=errmsg%> at <%=errline%> on message data: <%=msg%>. ' +
        'To start debugging, find the `seneca.sub` method call that defines the subscription action, and review the code of the action function.',
    ready_failed: 'Ready function failed: <%=message%>',
    unknown_message_reply: 'Reply for message <%=id%> failed as message is unknown: <%=args%>',
    maxparents: 'Message has too many parent messages (<%=maxparents%>). There may be an infinite loop. Parents: <%=parents%>, Message: <%=args%>',
    plugin_define_failed: "The definition action for the plugin <%=fullname%> has failed: <%=message%>. This error is considered fatal as all plugins have to initialize correctly. You should test the plugin by itself to verify that it is working correctly. Also ensure that the configuration options passed to the plugin are correct. These are shown below under in the DETAILS section. There could also be a bug in the plugin. If you think that is the case, please create a github issue on the plugin's repository<%=repo%>, and include this error report.",
    no_transport_client: 'The transport client defined by <%=config%> does not exist for message: <%=msg%>',
    invalid_plugin_option: 'Plugin <%=name%>: option value is not valid: <%=err_msg%> in options <%=options%>',
    plugin_gubu_shape: 'Plugin <%=name%>: its option defaults were built with gubu (at <%=path%>). ' +
        'Seneca 4 validates with shape, which does not accept gubu shapes. ' +
        'Build the defaults with this.valid (shape) or from the shape package.',
    add_gubu_shape: 'Action <%=pattern%>: its pattern rules were built with gubu (at <%=path%>). ' +
        'Seneca 4 validates with shape, which does not accept gubu shapes. ' +
        'Build the rules with seneca.valid (shape) or from the shape package.',
    no_prior_action: 'The `prior` method must be called inside an action function. Arguments were: <%=args%>',
    missing_plugin_name: 'The plugin name string was missing or empty.',
    bad_plugin_name: "The plugin name string cannot be empty and must be alphanumeric (matching /^[a-zA-Z][a-zA-Z0-9_]*$/), and cannot be longer than 1024 characters. Name was '<%=name.substring(0,1032)%>'.",
    bad_plugin_tag: "The plugin tag string, if defined, must be alphanumeric (matching /^[a-zA-Z0-9_]+$/), and cannot be longer than 1024 characters. Name was '<%=name.substring(0,1032)%>', and tag was '<%=tag.substring(0,1032)%>'.",
    bad_jsonic: 'Data string provided in Jsonic format (https://github.com/rjrodger/jsonic) has a syntax error: <%=syntax%> (line:<%=line%>, col:<%=col%>); original: <%=argstr%>',
    no_error_code: 'The Seneca.error or Seneca.fail method was called without an error code string as first argument.',
    fail_wrong_number_of_args: 'The Seneca.fail method was called with the wrong number of arguments: <%=num_args%>',
    fail_cond_must_be_bool: 'The Seneca.fail method expected the `cond` param to be a boolean.',
    action_timeout: 'Action <%=pattern%> timed out. Timeout was: <%=timeout%> (start: <%=start%>, end: <%=end%>. Message was: <%=message%>.',
    use_no_args: 'The seneca.use method needs at least one argument to define a plugin.',
    closed: 'The Seneca instance is closed and cannot process the message: <%=args%>.',
    unsupported_legacy_plugin: 'The plugin <%=fullname%> uses the unsupported legacy plugin definition ' +
        'signature "<%=init_func_sig%>". Seneca 4 plugin definition functions ' +
        'accept a single options argument, and use "this" as the Seneca instance.',
    transport_client_null: 'The transport client for configuration <%=type%> was not created ' +
        '(the role:transport,hook:client action returned nothing).',
    bad_logspec_string: 'The log option string "<%=logspec%>" is not a log level name, ' +
        'level abbreviation, numeric level, or logger name (flat, json, test).',
    bad_logspec: 'The log option must be a string, number, function, or object; was: <%=logspec%>.',
    invalid_event_name: 'Invalid event name: "<%=name%>". The seneca.on method only accepts ' +
        'known Seneca event names: <%=valid%>.',
    // Legacy error message codes
    act_invalid_args: 'Action <%=pattern%> has invalid arguments; <%=message%>; ' +
        'arguments were: <%=msg%>.',
};
exports.messages = messages;
// Deprecation notices (see lib/deprecate.ts). Each is reported once per
// process, as a Seneca log entry and a Node.js DeprecationWarning with the
// code SENECA_DEP_<KEY>.
const deprecation = {
    findact: 'seneca.findact is deprecated and will be removed in Seneca 5; use seneca.find.',
    hasact: 'seneca.hasact is deprecated and will be removed in Seneca 5; use ' +
        'seneca.find(pattern, { exact: false }), or seneca.has(pattern) for an exact pattern.',
    act_if: 'seneca.act_if is deprecated and will be removed in Seneca 5; call seneca.act inside an if statement.',
    findpins: 'seneca.findpins is deprecated and will be removed in Seneca 5; use seneca.list.',
    pinact: 'seneca.pinact is deprecated and will be removed in Seneca 5; use seneca.list.',
    plugins: 'seneca.plugins() is deprecated and will be removed in Seneca 5; use seneca.list_plugins().',
    findplugin: 'seneca.findplugin is deprecated and will be removed in Seneca 5; use seneca.find_plugin.',
    hasplugin: 'seneca.hasplugin is deprecated and will be removed in Seneca 5; use seneca.has_plugin.',
    closed: 'seneca.closed is deprecated and will be removed in Seneca 5; use seneca.flags.closed.',
    deathdelay: 'The deathdelay option is deprecated and will be removed in Seneca 5; use death_delay.',
    legacy_flag: 'The legacy.<%=flag%> option was removed in Seneca 4 and is ignored; ' +
        'it will not be accepted in Seneca 5.',
    legacy_error: 'The legacy.error option has no effect: errors always use the Seneca 4 format. ' +
        'It will be removed in Seneca 5.',
    plugin_init: 'Plugin <%=name%>: the init property of a plugin definition is deprecated and will be removed in Seneca 5; ' +
        'name the definition function define.',
    export_util: "seneca.export('util') is deprecated and will be removed in Seneca 5; use seneca.export('basic').",
    util_flatten: 'seneca.util.flatten is deprecated and will be removed in Seneca 5.',
    util_deepextend: 'seneca.util.deepextend is deprecated and will be removed in Seneca 5; use seneca.util.deep.',
    util_gubu: 'seneca.util.Gubu is deprecated and will be removed in Seneca 5: Seneca 4 validates with shape; ' +
        'use seneca.util.Shape or seneca.valid.',
    actdef_gubu: 'The gubu property of action definitions is deprecated and will be removed in Seneca 5; use shape.',
    act_err_4: 'The act-err-4 event is deprecated and will be removed in Seneca 5; act-err now has the same arguments.',
    role_seneca: 'The <%=pattern%> action is deprecated and will be removed in Seneca 5; use <%=replacement%>.',
    legacy_close_hook: 'Plugin <%=name%> adds a close hook on role:seneca,cmd:close, which is deprecated' +
        ' and will be removed in Seneca 5; use this.destroy(fn) or a prior on sys:seneca,cmd:close.',
    promisify: 'The promisify plugin is no longer needed: seneca.message, seneca.post and ' +
        'promises from ready, close and prior are built into Seneca 4. ' +
        'Remove seneca-promisify; it will not be supported in Seneca 5.',
};
exports.deprecation = deprecation;
exports.default = { ...messages, deprecation };
//# sourceMappingURL=errors.js.map