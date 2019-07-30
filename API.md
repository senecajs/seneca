
# Options



# Methods

## `use` (method)
Load plugin asynchronously.

* _spec_ - Plugin definition.
* _options_ - Plugin options.


### Parameters

#### _spec_ - string | object | function

* _string_, attempt to load plugin by passing the string to the
  `require` that loaded Seneca. See notes for search algorithm.

* _object_, use this as the plugin definition. Properties are (see Notes for details):
  ** _name_ - string - Name of plugin.
  ** _define_ - function - Definition action for plugin.

* _function_, use this as the plugin definition function. The name of
  the function is taken as the name of the plugin.


#### _options_ - object

Passed as the first argument to the plugin definition function to be
used for customizing the plugin's behavior.

Optional directives:

* _init$_ - boolean - If _false_, do not call the initialization action.
* _defined$_ - function - Callback function.
  ** Called afer the plugin definition action completes. First parameter is the plugin description as returned by `find_plugin`
* _inited$_ - function - Callback function.
  ** Called after the plugin initialization action completes. First parameter is the plugin description as returned by `find_plugin`

### Notes

TODO


#### Plugin tags

TODO



