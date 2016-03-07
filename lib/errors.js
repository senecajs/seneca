/* Copyright (c) 2010-2015 Richard Rodger, MIT License */
'use strict'

// Error code messages.
module.exports = {
  test_msg: 'Test message.',

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
    'the action function should be a metadata object: <%=actmeta%>.',

  add_empty_pattern: 'Could not add action, as the action pattern is empty: ' +
    '"<%=args%>"',

  act_if_expects_boolean: 'The method act_if expects a boolean value as its ' +
    'first argument, was: "<%=first%>".',

  act_not_found: 'No matching action pattern found for <%=args%>, and no default ' +
    'result provided (using a default$ property).',

  act_default_bad: 'No matching action pattern found for <%=args%>, and default ' +
    'result is not a plain object or an array: <%=xdefault%>.',

  act_no_args: 'No action pattern defined in "<%=args%>"; the first argument ' +
    'should be a string or object pattern.',

  act_invalid_args: 'Action <%=pattern%> has invalid arguments; <%=message%>; ' +
    'arguments were: <%=args%>.',

  act_execute: 'Action <%=pattern%> failed: <%=message%>.',

  act_callback: 'Action <%=pattern%> callback threw: <%=message%>.',

  act_loop: 'Action <%=pattern%> loops back on itself. Action details: <%=actmeta%>, history: <%=history%>',

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

  sub_function_catch: 'Pattern subscription function threw: <%=message%> on ' +
    'args: <%=args%>, result: <%=result%>.',

  ready_failed: 'Ready function failed: <%=message%>'
}
