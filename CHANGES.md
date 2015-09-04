
## 0.6.5: 2015-09-04 IN PROGRESS

   * revert to non-strict adds so that priors can be subset patterns, see issues 145, 149

## 0.6.4: 2015-07-29

   * bug fixes for issues: 144, 141, 143
   * documentation article on priors, issue 147

## 0.6.3: 2015-07-12

   * Use lab instead of mocha for unit testing
   * Use jsonic.stringify for consistent object string descriptions
   * Fix action-id/transaction-id edge cases; ids now transfer fully over priors and processes
   * Moved to docpad for github pages site
   * Rewrote getting started guide
   * Bug fixes for github issues: 135

## 0.6.2: 2015-06-22

   * REPL enhanced, now accepts literal jsonic patterns and traces action flow
   * Option debug.callpoint adds call point source file and line number tracing to logging
   * Bug fixes for github issues: 106, 125, 87, 110, 114, 130
   * Added logging option: --seneca.log.short makes all ids 2 chars in length
   * Added debug option: --seneca.print.tree(.all) - prints pattern tree to console
   * Bug fixes and minor updates to seneca-transport, seneca-web, seneca-basic, seneca-mem-store

## 0.6.1: 2015-02-04

   * "zig" style control flow for neater code
   * Much improved error logging and action tracing
   * Plugin initialization errors are fatal
   * Transport mapping sub-system completely refactored
   * Bug fixes for github issues: 92, 88, 86, 80, 97

## 0.5.21: 2014-10-07

   * Bug fixes for github issues: 70, 65, 48, 45

## 0.5.20: 2014-09-07

   * More standardized log messages that keep fields consistent
   * Regexp can be used to filter logs
   * Refactored plugin code into lib/plugin-utils
   * Fixed most github issues

## 0.5.19: 2014-07-13

   * Removed builtin plugins - all now in separate modules.
   * Updated to seneca-web 0.2 - now with admin module
   * Fixed broken .client and .listen chaining

## 0.5.18: 2014-07-09

   * Major update to message transport mechanism
   * Added plugin init queue so seneca.ready is no longer required
   * Added role:util,note:true actions for note storage, for inter-plugin data sharing
   * Moved plugin loading to new module, use-plugin
   * Moved utility functions to common
   * Removed deprecated functions
   * Added action execution cache
   * Improved error reporting

## 0.5.17: 2014-04-10

   * Moved standard store test to separate seneca-store-test module

## 0.5.16: 2014-04-09

   * use norma for api function arguments
   * parambulator arg checking moved into arg specification
   * stats moved outside to rolling-stats module
   * seneca.fix sets fixed args
   * started annotating source code
   * small improvement to error handling and logging

## 0.5.15: 2014-01-28

   * entity objects now use prototype style javascript objects - there's lots of them

## 0.5.14: 2013-10-30

   * moved web to own module, seneca-web
   * moved transport to own module, seneca-transport
   * transport now uses patterns, no longer hard-coded into seneca.js

## 0.5.13: 2013-10-01
   
   * moved pattern matcher into own module: patrun
   * added stats collection for actions
   * jshint applied to code, use npm run-script build

## 0.5.12: 2013-09-13

   * argsparser replaced with jsonic module
   * added act_if convenience method
   * deepextend can handle circular references
   * argprops cleans $ args

## 0.5.11: 2013-08-29

   * parambulator arg validation logged

## 0.5.10: 2013-08-18

   * added listen method for easy launching of services
   * added client method for easy http access of services

## 0.5.9: 2013-07-09

   * add export feature for plugins
   * seneca.depends - check plugin dependencies registered
   * API CHANGE: seneca.fail throws if no callback      
   * API CHANGE: seneca.http, mapping spec, data:true means place req.body into 'data' arg
   * API CHANGE: no async inside module def init:_plugin_ used instead for async init
   * API CHANGE: seneca.service replaced by seneca.export('web')

## 0.5.8: 2013-05-29

   * Entities get an inspect() function for util.inspect
   * Entity.toString prints nicer object values
   * SENECA_LOG environment variable can be used instead of --seneca.log command line arg
   * Seneca instance given to plugin init function includes a context object with reference to calling code module
   * Logging output slightly prettier
   * Config plugin looks for seneca.config.js in calling code folder
   * Config plugin supports environments


## 0.5.3: 2013-03-26

   * seneca.util.deepextend supports boxed types, thanks Mircea!


   