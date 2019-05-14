## 3.11.0 2019-05-15

* Fixed explain$ transport issues.
* Updated `joi` to @hapi/joi


## 3.10.0 2019-05-12

* Added explain$ directive to seneca.act - see test/explain.test.js - allows message actions to provide context-specific explanation data for behaviour on an ad hoc basis.


## 3.9.0 2019-05-06

* Added custom$ and fixed$ directives to seneca.add - see test/custom.test.js:custom-add - allows fixed message arguments and meta custom values on individual messages.


## 3.8.4 2019-03-03

* Seneca.translate can include/exclude message properties.
* Added `log` event so that plugins can capture log entries directly.


## 3.8.3 2019-02-25

* Seneca.fail throws Seneca Errors, whereas Seneca.error creates them.
* Seneca.error can create plugin scoped errors.


## 3.8.2 2019-02-17

* Allow plugin names that are file paths, and allow . in plugin names and tags.
* Plugins with seneca prefixes (seneca- or seneca@/) win - thus joi and seneca-joi in particular, are no longer confused.


## 3.8.1 2019-02-10

* Fix action annotations - seneca-joi now works again.


## 3.8.0 2019-01-13

* Plugin Seneca instance has `init` convenience method for initialization action.
* Plugins can define local error codes with `errors` property.
* Updated `fail` method throws Seneca Eraro exceptions directly and supports plugin-local codes.
* Option to ensure plugins load only once, and to ignore plugins.


## 3.7.0 2018-07-18

* `role:seneca,cmd:ping` responds with instance and process metrics.
* Fixed memory leak in history: https://github.com/senecajs/seneca/issues/680 .
* Utility modules available via Seneca.util: Eraro, Jsonic, Nid, Patrun.
* `meta.custom` is now preserved properly over entire action pathway including transports.


## 3.6.0 2018-05-28

* `translate` method simplifies translating message patterns.
* Message metadata has `custom` sub-object that propogates with message.


## 3.5.0 2018-05-14

* Better format for fatal error messages.
* Passes `npm audit`.
* Fixed double `sub` call.


## 3.4.3 2017-10-13

* Supports --seneca.test to trigger test mode.
* Support SENECA_TEST enviroment variable.


## 3.4.2 2017-08-10

* Fixes priors bug #662.
* Removes errant debugging code.
* Fixes history pruning.
* Slightly neater test logs (suffix to IN/OUT indicates sync/async message).


## 3.4.1 2017-07-06

* Backwards compatibility fix for seneca-amqp-transport 2.2.0 (legacy.meta=true).


## 3.4.0 2017-07-03

* Verified working against Node 8.
* Added github standard code of conduct.
* Now using https://github.com/prettier/prettier as code format.
* Refactored message and reply meta data, making message tracking much easier; Actions and callbacks get a third parameter `meta`, that has all the details.
* Minor refactor of error handling so that errors are passed-through; intended for 4.x, enable with legacy.error=false.
* Next-generation transport (2X faster, new simpler API for transport writers) included in core Seneca; only http transport written; intended to be default transport in 4.x, enable with legacy.transport=false.
* As part of next-generation transport, a new message protocol that gives the message data priority as a JSON object, and placed Seneca meta data into the meta$ property.
* Action cache replaced by action history utility, making a decoupled seneca.reply method possible (as used (and needed) by next-generation transport).
* Fixed root deprecation warning; Better, but incomplete refactor of source files; some minor fixes;


## 3.3.0 2017-02-07

* Action callback can omit Error parameter (hapi style): http://senecajs.org/api/#method-add
* Minor updates for consistency with new API docs: http://senecajs.org/api
* Updated use-plugin to 0.3.2.
* Plugin options are now consistent with global options after plugin load.


## 3.2.0 2016-09-27

* Added .inward() api method.
* Added .outward() api method.
* Made logging safely stringify input.
* Fixed memory leak / timeout bug in gate-executor.


## 3.1.0 2016-09-16

* Correct issue with log handlers not working via command line
* Extracted out log handling into seneca-log-filters for ease of reuse in custom loggers
* Replaced the default log handler's filter logic with seneca-log-filters
* Bumped patrun to correct incorrect matches with partial patterns due to missing catchall
* Added error handling example in docs/examples/error-handling.js.
* Changed boot log message from 'hello' to 'seneca-started'.
* Updated salestax examples to work correctly.
* Removed old legacy parsing handlers as they caused crashes
* Added testable transport links


## 3.0.0 2016-08-26

* Refactored 'old' logging into it's own external plugin; seneca-legacy-logger.
* Added new adaptor based JSON logging. External loggers can now be used with Seneca.
* Created new 'built-in' logger which is used as the default logger if none are provided.
* Corrected bug in Seneca.util.deepextend via Lodash version bump.
* Updated gate-executor plugin to fix issues in load determinism and generally improve perf.
* Replaced large swathes custom code with Lodash to improve speed and reliability.
* Exposed parsepattern function via seneca.util.parsepattern as required by seneca-chain to function.
* Removed all 'dead' code marked legacy. Updated other parts of codebase with legacy comments for v.next.
* Removed default settings for seneca-admin as it is not a default loaded plugin.
* Set `options.actcache.active` to be false by default. Disables actcache feature by default.
* Moved `close_signals` from `options.internal` to `options.system`.
* Moved `catchall` from `options.internal` to `options.system`.
* Removed `options.schema` as it was only partially checking and needs a rethink.
* Removed mem-store as a required dependency in the package.
* Devolved store logic in 'store.js' fully to seneca-entity. Entites are now 'fully removed'.
* Devolved chain functionality into seneca-chain and removed from library. Moved all related tests.
* Devolved pin functionality into seneca-pin and removed from library. Moved all related tests.
* Removed seneca-web as a default loaded plugin. Removed related tests. Removed from package.
* Removed seneca-cluster as a default loaded plugin. Removed related tests. Removed from package.
* Removed seneca-seneca as a default loaded plugin. Removed related tests. Removed from package.
* Removed seneca-echo as a default loaded plugin. Removed related tests. Removed from package.
* Removed seneca-basic as a default loaded plugin. Removed related tests. Removed from package.
* Removed seneca-repl as a default loaded plugin. Removed related tests. Removed from package.
* Removed seneca-parambulator as a default loaded plugin. Removed related tests. Removed from package.
* Removed parambulator as a default loaded plugin. Removed related tests. Removed from package.
* Removed joi as a default loaded plugin. Removed related tests. Removed from package.
* Moved min required version of Node to greater than `4.0`. `0.10` and `0.12` are no longer supported.
* Added support for Node `6.x` with minimal changes to account for api differences.
* Removed LTS doc as it gives the wrong information. Website update to follow.
* Updated all dependencies. Locked deps because of `0.x` support have been updated too.
* Modified tests to account for breaking changes in both lab and code after updating to latest.
* Updated eslint-config-seneca with local rules and removed. Corrected peer dependency issues around linting plugins.
* Annotations are no longer stored in the repo and must be generated locally. Annotations are found in `docs/annotated`
* Annotations now work for the whole library, not just `seneca.js`
* Coverage report now generates as `/docs/coverage.html` and is not stored in the repo.
* Coverage and Annotations can now be generated via `npm run coverage` and `npm run annotate` respectively.
* Paired back and updated travis file. Plugins are now tested via `seneca-test-rig` instead of with Seneca.
* Moved older examples into folders for clarity and added another 5 examples showing more concepts; see `docs/examples`
* Removed ALL redundant code files from `test` put stubs in `test/stubs` folder. All tests are now in the root.
* Added test to show how to use exportmap in plugins to export values and functions; see `/test/plugin.test.js:L23`
* Removed old release scripts in favour of `docs/examples/create-a-release.md` and using seneca-test-rig for plugin testing.


## 2.1.0: 2016-05-20

* Fix for parambulator not correctly testing messages. PR #422
* Parambulator validation logic moved to it's own plugn. PR #420
* Allow validation provider to be swapped out (requires flag). PR #420
* Improvements to the test rig. PR #427, #405


## 2.0.1: 2016-04-13

* Filter undefined options. PR #386
* Enhancement to README. PR #391


## 2.0.0: 2016-03-22

* Update transport version to 1.2.0. PR #377
* Remove Seneca as a dependency. PR #378
* Remove entities as a default plugin. PR #379


## 1.4.0: 2016-03-16

* Add setting for immediate pinning. PR #358
* Allow overriding action timeout. PR #359
* Use lodash defaultsDeep to implement util.deepextend. PR #364
* Update transport dependency. PR #372


## 1.3.0: 2016-03-01

* Default tag when undefined. PR #349
* Update transport dependency. PR #351
* Update transport dependency. PR #352
* Add test and return listener address info. PR #353
* Add test for pinning. PR #357


## 1.2.0: 2016-02-17

* Entity is now loaded as a plugin from the seneca-entity module. PR #343
* `act` now can receive more than two arguments in the callback. PR #341


## 1.1.0: 2016-01-28

* Plugin options can now be loaded and provided asynchronously to future plugins.
See Issue #293 for further details.
* `Seneca` is now exposed as a property on the main exports. PR #320
* `strict.find` is a new option.  It allows not-found actions to default to returning
an empty object as the result, instead of erroring.  PR #333
* `seneca-web` is now at version 0.7.0, which includes support for hapi.  PR #331
* `seneca-mem-store` and `seneca-basic` are updated to the latest versions. PR #332
All issues for v1.1.0 are contained in the [1.1.0 milestone](https://github.com/senecajs/seneca/milestones/1.1.0)


## 1.0.0: 2016-01-11

* Fixed API wrapper so that original function name preserved. Issue #296
* Fixed CLI `--seneca.print.tree` arg so that it works correctly. Issue #235
* Seneca instance now passed as property on `add` callback function.  PR #290
* Dependencies updated to latest versions. PR #285 and #304


## 0.9.3: 2015-12-21

* Fixed calling error handler twice with the same error. Issue #245
* Fixed npm install error message. Issue #274
* Updated transport plugin to recent version


## 0.9.2: 2015-12-14

* Fixed seneca Error when loading old style plugin
* Revert deprecation warning from 0.9.0 when calling `act` during plugin initialization


## 0.9.1: 2015-12-08

* Fixed pins only working when they are provided as strings plus additional tests PR 268

## 0.9.0: 2015-12-03

  * `act` now displays a deprecation warning when its invoked within a plugin
    initialization function.  To disable deprecation warnings, run node with
    `--no-deprecation`. PR 254
  * `private$` is now exposed on seneca object. PR 260
  * The repl is now an external plugin, enabled by default.  To disable set
    `default_plugins.repl` to false when creating seneca object. PR 255
  * Cluster is now an external plugin, enabled by default.  To disable set
    `default_plugins.cluster` to false when creating seneca object. PR 256
  * Closing seneca now removes all relevant event listeners. PR 259
  * `has` function now converts strings to javascript objects. PR 262
  * Internal cleanup and organization of code, as well as more tests.


## 0.8.0: 2015-11-20

   * Fixed seneca.print.tree[all] argument not being passed correctly to optioner.
     Issue 177.
   * Fix minor memory leak, when seneca closed it didn't detach process
     listeners.  Pull request 230 and issue 226.
   * Fix api_delegate not calling client and server with arguments.  Pull
     request 218.
   * Throw when trying to use seneca in cluster mode on node 0.10.  This is do to
     to cluster support in node not working correctly prior to version 0.12.0.
     Pull request 227.
   * Outdated dependencies are updated to their latest stable ES5 versions.  
     Pull request 236.
   * New function added to seneca named `decorate`.  Used to extend the core
     seneca object with new functionality.  Pull request 233.
   * Support data store `merge$` ability.  Pull request 217.
   * Support added for arrays to be used as defaults in actions. Issue 185.
   * General code cleanup and linting of internal code to follow style guide.  
     More tests were also added to increase code coverage.  Pull requests 207,
     208, 214, 215, 223, 229, 238

   For all of the release information please view the 0.8.0 milestone on github:
   https://github.com/senecajs/seneca/milestones/0.8.0


## 0.7.2: 2015-10-27

   * Fix support for catchall (without pins) clients. Issue 199. Pull
     request 200.


## 0.7.1: 2015-10-05

   * repl now supports quit/exit command
   * seneca.sub provides subscription pattern via meta$.sub


## 0.7.0: 2015-10-04

   * support node 4
   * update to patrun 0.5; now supports glob adds
   * new documentation system


## 0.6.5: 2015-09-04

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
