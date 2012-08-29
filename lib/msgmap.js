
module.exports = {
  seneca: {
    service_unknown_plugin: "service(pluginname): unable to build service, unknown plugin name: <%=pluginname%>",
    plugin_unknown_plugin: "service(pluginname): unknown plugin name: <%=pluginname%>",
    api_not_found: "api(pluginname): the plugin <%=pluginname%> does not provide an api",
    act_not_found: "act(args,cb): action not found for args = <%=json$(args)%>",
    act_error: "seneca.act(args,cb): exception inside action: <%=json$(error)%>",
    callback_exception: "seneca(opts,cb): exception inside callback: <%=json$(error)%>",
  }
}