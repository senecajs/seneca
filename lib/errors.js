/* Copyright © 2010-2018 Richard Rodger and other contributors, MIT License. */
'use strict'

// Error code messages.
module.exports = {
  test_msg: 'Test message.',

  test_args: 'Test args <%=arg0%> <%=arg1%>.',

  test_prop:
    'TESTING: exists: <%=exists%>, notfound:<%=notfound%>, str=<%=str%>,' +
    ' obj=<%=obj%>, arr=<%=arr%>, bool=<%=bool%>, null=<%=null$%>, delete=<%=delete$%>, undefined=<%=undefined$%>, void=<%=void$%>, NaN=<%=NaN$%>',

  add_string_pattern_syntax:
    'Could not add action due to syntax error in ' +
    'pattern string: "<%=argstr%>": Line:<%=line%>, Column:<%=col%>; <%=syntax%>',

  act_string_args_syntax:
    'Could execute action due to syntax error in argument' +
    ' string: "<%=argstr%>": Line:<%=line%>, Column:<%=col%>; <%=syntax%>',

  add_pattern_object_expected_after_string_pattern:
    'Could not add action; ' +
    'unexpected argument; a pattern object or function should follow the pattern' +
    ' string; arguments were: "<%=args%>".',

  add_pattern_object_expected:
    'Could not add action; unexpected argument; ' +
    'a pattern object or string should be the first argument; ' +
    'arguments were: "<%=args%>".',

  add_action_function_expected:
    'Could not add action: the action function ' +
    'should appear after the pattern; arguments were: "<%=args%>".',

  add_action_metadata_not_an_object:
    'Could not add action: the argument after ' +
    'the action function should be a metadata object: <%=actdef%>.',

  add_empty_pattern:
    'Could not add action, as the action pattern is empty: ' + '"<%=args%>"',

  act_if_expects_boolean:
    'The method act_if expects a boolean value as its ' +
    'first argument, was: "<%=first%>".',

  act_not_found:
    'No matching action pattern found for <%=args%>, and no default ' +
    'result provided (using a default$ property).',

  act_default_bad:
    'No matching action pattern found for <%=args%>, and default ' +
    'result is not a plain object or an array: <%=xdefault%>.',

  act_no_args:
    'No action pattern defined in "<%=args%>"; the first argument ' +
    'should be a string or object pattern.',

  act_invalid_msg:
    'Action <%=pattern%> received an invalid message; <%=message%>; ' +
    'message content was: <%=msg%>.',

  act_execute: 'Action <%=pattern%> failed: <%=message%>.',

  act_callback: 'Action <%=pattern%> callback threw: <%=message%>.',

  act_loop:
    'Action <%=pattern%> loops back on itself. Action details: <%=actdef%>, history: <%=history%>',

  result_not_objarr:
    'Action <%=pattern%> responded with result that was not an ' +
    'object or array: <%=result%>; Use option strict:{result:false} to allow; ' +
    'arguments were: <%=args%>',

  no_client: 'Transport client was not created; arguments were: "<%=args%>".',

  invalid_options: 'Invalid options; <%=message%>',

  plugin_required:
    'The <%=name%> plugin depends on the <%=dependency%> plugin, ' +
    'which is not loaded yet.',

  plugin_init: 'The <%=name%> plugin failed to initialize: <%=plugin_error%>.',

  plugin_init_timeout:
    'The <%=name%> plugin failed to initialize within ' +
    '<%=timeout%> milliseconds (The init:<%=name%> action did not call the "done"' +
    ' callback in time).',

  export_not_found: 'The export <%=key%> has not been defined by a plugin.',

  store_cmd_missing:
    'Entity data store implementation is missing a command; ' +
    '"<%=cmd%>": "<%=store%>".',

  sub_function_catch:
    'Pattern subscription function threw: <%=message%> on ' +
    'args: <%=args%>, result: <%=result%>.',

  ready_failed: 'Ready function failed: <%=message%>',

  unknown_message_reply:
    'Reply for message <%=id%> failed as message is unknown: <%=args%>',

  maxparents:
    'Message has too many parent messages (<%=maxparents%>). There may be an infinite loop. Parents: <%=parents%>, Message: <%=args%>',

  plugin_define:
    "The definition function for the plugin <%=fullname%> has failed: <%=message%>. This error is considered fatal as all plugins have to initialize correctly. You should test the plugin by itself to verify that it is working correctly. Also ensure that the configuration options passed to the plugin are correct. These are shown below under in the DETAILS section. There could also be a bug in the plugin. If you think that is the case, please create a github issue on the plugin's repository<%=repo%>, and include this error report.",

  no_transport_client:
    'The transport client defined by <%=config%> does not exist for message: <%=msg%>',

  invalid_plugin_option:
    'Plugin <%=name%>: option value is not valid: <%=err_msg%> in options <%=options%>',

  no_prior_action:
    'The `prior` method must be called inside an action function. Arguments were: <%=args%>',

  missing_plugin_name: 'The plugin name string was missing or empty.',

  bad_plugin_name:
    "The plugin name string cannot be empty and must be alphanumeric (matching /^[a-zA-Z][a-zA-Z0-9_]*$/), and cannot be longer than 1024 characters. Name was '<%=name.substring(0,1032)%>'.",

  bad_plugin_tag:
    "The plugin tag string, if defined, must be alphanumeric (matching /^[a-zA-Z0-9_]+$/), and cannot be longer than 1024 characters. Name was '<%=name.substring(0,1032)%>', and tag was '<%=tag.substring(0,1032)%>'.",

  bad_jsonic:
    'Data string provided in Jsonic format (https://github.com/rjrodger/jsonic) has a syntax error: <%=syntax%> (line:<%=line%>, col:<%=col%>); original: <%=argstr%>',

  no_error_code:
    'The Seneca.error or Seneca.fail method was called without an error code string as first argument.',

  // Legacy error message codes

  act_invalid_args:
    'Action <%=pattern%> has invalid arguments; <%=message%>; ' +
    'arguments were: <%=msg%>.'
}

module.exports.deprecation = {
  seneca_parent:
    'Seneca.parent has been renamed to Seneca.prior. Seneca.parent will be removed in Seneca 4.x.',

  seneca_next_act: 'Seneca.next_act will be removed in Seneca 3.x'
}
