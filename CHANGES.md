
## 0.5.13:

   * entity objects now use prototype style javascript objects - there's lots of them

## 0.5.14: 2013-10-30

   * moved web to own module, seneca-web
   * moved transport to own module, seneca-transport
   * transport now uses patterns, no longer hard-coded into seneca.js

## 0.5.13:
   
   * moved pattern matcher into own module: patrun
   * added stats collection for actions
   * jshint applied to code, use npm run-script build

## 0.5.12:

   * argsparser replaced with jsonic module
   * added act_if convenience method
   * deepextend can handle circular references
   * argprops cleans $ args

## 0.5.11:

   * parambulator arg validation logged

## 0.5.10:

   * added listen method for easy launching of services
   * added client method for easy http access of services

## 0.5.9: 

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


   