---
layout: main.html
title: How to Write a Seneca Plugin
---

# How to Write a Seneca Plugin


When you use the Seneca framework, you write plugins all the
time. They're an easy way to organize your action patterns.



A Seneca plugin is just a function that gets passed an _options_
object, and has a Seneca instance as its _this_ variable. You
then <a href="http://senecajs.org/api.html#long-m-add">_add_</a> some action
patterns in the body of the function, and you're done. There is no
callback.



This article will show some plugin examples, with code, going from
basic to advanced. It will cover the plugin API, and the conventions
to use when writing them. You'll need to log the behaviour of your
plugins, and you'll need to know how to debug them, so that will be
discussed too.



There are many Seneca plugins published on
<a href="http://www.npmjs.org/search?q=seneca%20plugin">NPM</a>. Most of them
can be extended and modifed by overriding their actions. You'll also
need to know how to do this.



Finally, plugins provide you with a way to organize your own code, and
to make use of the
<a href="http://martinfowler.com/articles/microservices.html">micro-services</a>
approach to software architecture, so that will be discussed too.

## Contents

- [A Simple Plugin]()
- <a href="#wp-ismodule">A Plugin is a Module</a>
- <a href="#wp-name">Give Your Plugin a Name</a>
- <a href="#wp-options">Dealing with Options</a>




<small style="float:right"><a href="#wp-contents">[top]</a></small>
## A Simple Plugin


Let's write a plugin that defines one action. The action uses the
plugin _options_ argument to build a result.


``` js
var plugin = function( options ) {

  this.add( {foo:'bar'}, function( args, done ) {
    done( null, {color: options.color} )
  })

}
```


A plugin is just a function. You can see that there is no callback
passed into this function that defines the plugin. So, how does Seneca
know that the plugin has fully initialized? It's an important
questions, because the plugin might depend on establishing a database
connection before it can operate properly.



As with most things in Seneca, you define an action pattern to handle
initialization, and make sure it happens in the proper order. We'll
talk about plugin initialization a little later. Many plugins don't
even need to initialize because all they do is define a set of action
patterns.



The example above defines a single action
pattern, _foo:bar_. This action provides a result based on the
options provided to the plugin. Plugin options are not required, but
if they are provided, they are passed in as the first argument to the
plugin definition function. The _options_ argument is just a
JavaScript object with some properties. Seneca makes sure it always
exists. Even in the case where you have no options, you'll still get
an empty object.



The context object of the plugin function (that is, the value
of _this_), is a Seneca instance that you can use to define
actions. That means you don't need to
call `require('seneca')` when defining a plugin. This
Seneca instance provides the standard API, but the logging methods are
special - they append infomation about the plugin. So when you
call `this.log.debug('stuff about my plugin')`, the log
output will contain extra fields identifying the plugin, such as its
name. In this example, you haven't given the plugin a name (you'll see
how to do that in a moment), so Seneca will generate a short random
name for you.



You can use the plugin by calling
the <a href="http://senecajs.org/api.html#long-m-use">use</a> method
of the Seneca object. This loads the plugin into Seneca, after which
the action patterns defined by the plugin are available. You can then
call the <a href="http://senecajs.org/api.html#long-m-act">act</a>
method to trigger them, like so:


``` js
// simple.js

var seneca = require('seneca')()

var plugin = function( options ) { ... } // as above

seneca.use( plugin, {color:'pink'} )
seneca.act( {foo:'bar'}, console.log )
```


This code is available in
the <a href="https://github.com/rjrodger/seneca/tree/master/doc/examples/write-a-plugin">doc/examples/write-a-plugin</a>
example, in the _simple.js_ script. Running the script produces:

```bash
$ node simple.js
null { color: 'pink' }
```


In the output, the _null_ is the first argument
to _console.log_, and indicates that there was no error.  The
output is a JavaScript object with single property _color_, the
value of which is set from the original options given to the plugin.


<small style="float:right"><a href="#wp-contents">[top]</a></small></a>
## A Plugin is a Module


The Seneca _use_ method can also accept module references. That
is, if you can _require_ it, you can _use_ it! Let's update the
simple example to show this. First, create a file called _foo.js_
containing the plugin code (all the files in this article are available on
the Seneca github
at <a href="https://github.com/rjrodger/seneca/tree/master/doc/examples/write-a-plugin">doc/examples/write-a-plugin</a>).


``` js
// foo.js

module.exports = function( options ) {

  this.add( {foo:'bar'}, function( args, done ) {
    done( null, {color: options.color} )
  })

}
```


The _foo.js_ file is a normal JavaScript file you can load into Node.js with _require_. It exposes a single function that takes the plugin _options_. To use the plugin, the code is almost the same as before, except that you pass in the _foo.js_ relative file path in the same way you would for _require_.


``` js
// module.js

var seneca = require('seneca')()

seneca.use( './foo.js', {color:'pink'} )
seneca.act( {foo:'bar'}, console.log )
```


The code produces the same output as before:


```bash
$ node module.js
null { color: 'pink' }
```


As well as local files and local modules, you can use public plugin modules
from <a href="https://www.npmjs.org/search?q=seneca">npmjs.org</a>. Let's use
the <a href="https://www.npmjs.org/package/seneca-echo">seneca-echo
plugin</a> as an example. This plugin echoes back arguments you send
to the _role:echo_ pattern. First, _npm install_ it:


```bash
$ npm install seneca-echo
```


Then use it:


``` js
// echo.js

var seneca = require('seneca')()

seneca.use( 'seneca-echo' )
seneca.act( {role:'echo', foo:'bar'}, console.log )
```


Running _echo.js_ produces:


``` js
$ node echo.js
null { foo: 'bar' }
```


You aren't using any options in this example. The _seneca-echo_
plugin just reproduces the arguments passed in. In this
case _foo:bar_. The _role_ property is not included in
the output.



The Seneca framework comes
with <a href="http://senecajs.org/plugins.html">many plugins</a>
written by the community. Feel free to write one yourself (after
reading this article!). By convention, public and generically useful
plugins are prefixed with _seneca-_ as part of their name. This
lets you know the module is a Seneca plugin if you see it on
NPM. However, its a bit tedious to type in "seneca-" all the time, so
you are allowed to abbreviate plugin names by dropping the "seneca-"
prefix. That means you can use the the _seneca-echo_ by just
providing the "echo" part of the name:


``` js
seneca.use( 'echo' )
```


<small style="float:right"><a href="#wp-contents">[top]</a></small>
## Give Your Plugin a Name


Your plugin needs a name. You can return a string from the plugin
definition function to give it one. When you look at the Seneca logs,
you can see what your plugin is doing. Let's try it!


``` js
// name0.js

var plugin = function( options ) {

  this.add( {foo:'bar'}, function( args, done ) {
    done( null, {color: options.color} )
  })

  return 'name0'
}

var seneca = require('seneca')()

seneca.use( plugin, {color:'pink'} )
seneca.act( {foo:'bar'}, console.log )
```


And then run it like so:


```bash
$ node name0.js --seneca.log=plugin:name0
... DEBUG  act  name0  -  yvgt5y48wqjb  IN   {foo=bar}  ...
... DEBUG  act  name0  -  yvgt5y48wqjb  OUT  {color=pink}  ...
null { color: 'pink' }
```


This uses Seneca's log filtering feature to focus on the log lines
that you care about. For more details on log filtering, read
the <a href="http://senecajs.org/logging-example.html">logging tutorial</a>.



To avoid repetition, the public plugins drop their "seneca-" prefix
when registering their names. Try this:


```bash
$ node echo.js --seneca.log=plugin:echo
... DEBUG  plugin  echo  -  add  echo  -  {role=echo}  ...
... DEBUG  act     echo  -  lkmlk29r6uwt  IN   {role=echo,foo=bar}  ...
... DEBUG  act     echo  -  lkmlk29r6uwt  OUT  {foo=bar}  ...
null { foo: 'bar' }
```


You may have noticed something interesting. There were three lines of
logging output that time. Why didn't you see an "add" line for your
"name0" plugin? During the execution of its definition function, it
didn't have a name. You only gave it one when you returned a
name. Sometimes this is useful, because you can set a name
dynamically. Still, is it possible to set the name intially? Yes! Just
give the defining function a name:



``` js
// name1.js

var plugin = function name1( options ) {

  this.add( {foo:'bar'}, function( args, done ) {
    done( null, {color: options.color} )
  })
}

var seneca = require('seneca')()

seneca.use( plugin, {color:'pink'} )
seneca.act( {foo:'bar'}, console.log )
```


Running this gives:


```bash
$ node name1.js --seneca.log=plugin:name1
... DEBUG  plugin  name1  -  add  name1  -  {foo=bar}  ...
... DEBUG  act     name1  -  b3uamicogfnm  IN   {foo=bar}  ...
... DEBUG  act     name1  -  b3uamicogfnm  OUT  {color=pink}  ...
null { color: 'pink' }
```



When you load a plugin as a module then the module reference, as
supplied to the _use_ method, becomes the initial name of the
module (Of course, you can override this by returning your own name)
Here's the _foo.js_ plugin again:



```bash
$ node module.js --seneca.log=plugin:./foo.js
... DEBUG  plugin  ./foo.js  -  add  ./foo.js  -  {foo=bar}  ...
... DEBUG  act     ./foo.js  -  47ssblskuj59  IN   {foo=bar}  ...
... DEBUG  act     ./foo.js  -  47ssblskuj59  OUT  {color=pink}  ...
null { color: 'pink' }
```



There's an obvious risk that you might have a naming conflict. Seneca
allows this because it's more useful to have the ability to
override plugins. If you're defining your own set of plugin names,
it's best to choose a short prefix for your project. This is a good
idea in general for many frameworks!



For example, if you're working on the Manhattan project, choose the
prefix _mh_. Then call your "Trinity" plugin _mh-trinity_.



There are no hard and fast rules for naming your action
patterns. However, there are some conventions that help to organize
the patterns. Your plugin is providing functionality to the
system. This functionality fulfills a role in the system. So it makes
sense to use the form _role:plugin-name_ as part of your action
pattern. This creates a pattern namespace to avoid clashes with other
plugin patterns. The use of the word "role" also indicates that other
plugins may override some aspects of this role (that is, aspects of
this functionality) by providing extensions to some of the action
patterns.



For example,
the <a href="https://github.com/rjrodger/seneca-vcache">seneca-vcache
plugin</a> overrides the standard entity patterns, of the
form _role:entity, cmd:*_. It does this to transparently add
caching to the database store operations.



Another common convention is to use the property "cmd" for the main
public commands exposed by the plugin. So, you might have, for
example:


``` js
var plugin = function trinity( options ) {

  this.add( {role:'trinity', cmd:'detonate'}, function( args, done ) {
    // ... compress plutonium, etc
  })
}
```


Many of the public Seneca plugins on NPM follow this pattern. You may
find other patterns more useful in your own projects, so don't feel
obligated to follow this one.



If you load a plugin multiple times, only the last one loaded will be
used. You can however load multiple separate instances of the same
plugin, by using tag strings. NOTE: the action patterns will still be
overridden, unless the plugin handles this for you (like the example
below). The data store plugins, in particular, use this mechanism to
support multiple databases in the same system. For more details, read
the <a href="http://senecajs.org/data-entities.html">data entities
tutorial.</a>



Here's a simple example that uses tags. In this case,
the _bar.js_ plugin defines an action pattern using one of its
option properties. This means that different action patterns are
defined depending on the options provided.


``` js
// bar.js
module.exports = function( options ) {
  var tag = this.context.tag

  this.add( {foo:'bar', zed:options.zed}, function( args, done ) {
    done( null, {color: options.color, tag:tag} )
  })

}
```


You can access the tag value from the context property of the plugin
Seneca instance: `this.context.tag`



You still want to debug and track each instance of this plugin, so you
provide a tag each time you register it with the _use_
method. Tags can be supplied in two ways, either by description object
for the plugin, or by suffixing a _$_ character, and then the
tag, to the plugin module reference. Here's the example code:


``` js
// tags.js
var seneca = require('seneca')()

seneca.use( {name:'./bar.js',tag:'AAA'}, {zed:1,color:'red'} )
seneca.use( './bar.js$BBB',              {zed:2,color:'green'} )

seneca.act( {foo:'bar',zed:1}, console.log )
seneca.act( {foo:'bar',zed:2}, console.log )
```


Running this code produces the output:


```bash
$ node tags.js
null { color: 'red', tag: 'AAA' }
null { color: 'green', tag: 'BBB' }
```


Using the debug log shows the different instances of the plugin in action:


```bash
$ node tags.js --seneca.log=plugin:./bar.js
... DEBUG  plugin  ./bar.js  AAA  add  ./bar.js  AAA  {foo=bar,zed=1}  ...
... DEBUG  plugin  ./bar.js  BBB  add  ./bar.js  BBB  {foo=bar,zed=2}  ...
... DEBUG  act     ./bar.js  AAA  pamds7vlteyv  IN   {foo=bar,zed=1}  ...
... DEBUG  act     ./bar.js  BBB  4uxz90gcczn5  IN   {foo=bar,zed=2}  ...
... DEBUG  act     ./bar.js  AAA  pamds7vlteyv  OUT  {color=red,tag=AAA}  ...
null { color: 'red', tag: 'AAA' }
... DEBUG  act     ./bar.js  BBB  4uxz90gcczn5  OUT  {color=green,tag=BBB}  ...
null { color: 'green', tag: 'BBB' }
```


To isolate a tag, use these log settings:


```bash
$ node tags.js --seneca.log=plugin:./bar.js,tag:AAA
... DEBUG  plugin  ./bar.js  AAA  add  ./bar.js  AAA  {foo=bar,zed=1}  ...
... DEBUG  act     ./bar.js  AAA  9rp8luozaf92  IN   {foo=bar,zed=1}  ...
... DEBUG  act     ./bar.js  AAA  9rp8luozaf92  OUT  {color=red,tag=AAA}  ...
null { color: 'red', tag: 'AAA' }
null { color: 'green', tag: 'BBB' }
```


<small style="float:right"><a href="#wp-contents">[top]</a></small>
## Dealing with Options


It's useful to provide default option values for users of your
plugin. Seneca provides a utility function to support
this: `seneca.util.deepextend`. The `deepextend`
function works much the same
as <a href="http://underscorejs.org/#extend">`_.extend`</a>,
except that it can handle properties at any level. For example:


``` js
// deepextend.js
var seneca = require('seneca')()

var foo = {
  bar: 1,
  colors: {
    red:   50,
    green: 100,
    blue:  150,
  }
}

var bar = seneca.util.deepextend(foo,{
  bar: 2,
  colors: {
    red: 200
  }
})

console.log(bar)
// { bar: 2, colors: { red: 200, green: 100, blue: 150 } }
```


The property `colors.red` is overridden, but the other colors retain
their default values.



You can use this in your own plugins. Let's add default options to
the _foo.js_ module (as above).


``` js
// foo-defopts.js
module.exports = function( options ) {

  // Default options
  options = this.util.deepextend({
    color: 'red',
    box: {
      width:  100,
      height: 200
    }
  },options)


  this.add( {foo:'bar'}, function( args, done ){
    done( null, { color:      options.color,
                   box_width:  options.box.width,
                   box_height: options.box.height
                })
  })

  return {name:'foo'}
}
```


<small>
(As an aside, note that you can also specify the name of the
plugin by returning an object of the form `{name:...}`. You'll
see some more properties you can add this return object
below).
</small>


The default option structure is used as the base for the user supplied
options. Let's supply some user options that will override the defaults:


``` js
// module-defopts.js
var seneca = require('seneca')()

seneca.use( './foo-defopts.js', {
  color:'pink',
  box:{
    width:50
  }
})

seneca.act( {foo:'bar'}, console.log )
```



This code runs the _foo:bar_ action, which produces:


```bash
$ node module-defopts.js
null { color: 'pink', box_width: 50, box_height: 200 }
```


The default values for `color` and `box.width` (_red_ and _100_, respectively), have been overridden by the options provided as the second argument to `seneca.use` when the plugin is loaded (_pink_ and _50_).



You can load plugin options from configuration files. Seneca looks for a file named _seneca.options.js_ in the current folder, and _requires_ the file if it exists. This file should be a Node.js module that exports a JSON object. For example:


``` js
// seneca.options.js
module.exports = {
  zed: {
    red:   50,
    green: 100,
    blue:  150,
  },
  'zed$tag0': {
    red:   55,
  }
}
```


You can specify global Seneca options in this file, and you can
specify options for individual plugins. Top level properties that
match the name of a plugin are used to provide options to plugins when
they are loaded.



Let's see this in action. The _zed.js_ script defines a plugin
that prints out the plugin name and tag
using `this.context` (see above), and also prints out the
options provided to the plugin by Seneca.


``` js
// zed.js
function zed( options ) {
  console.log( this.context.name, this.context.tag, options )
}

var seneca = require('seneca')()

seneca.use( zed )
```


As the example _seneca.options.js_ file defines a _zed_ property, this is used to provide options to the _zed_ plugin. Running the _zed.js_ script prints out the options loaded from _seneca.options.js_:


```bash
$ node zed.js
zed undefined { red: 50, green: 100, blue: 150 }
```


If you are using tags to create multiple instances of the same plugin, you can use the _$suffix_ convention to specify options particular to a given tagged plugin instance. The _zed-tag.js_ script is the same as the _zed.js_ script, except that it also creates an additional tagged instance of the _zed_ plugin. Note that the definition of the plugin uses a properties object, with the `init` property specifying the plugin definition function.


``` js
// zed-tag.js
function zed( options ) {
  console.log( this.context.name, this.context.tag, options )
}

var seneca = require('seneca')()

seneca.use( zed )
seneca.use( {init:zed, name:'zed', tag:'tag0'} )
```


The _seneca.options.js_ file also defines a _zed$tag0_ property, and the options for the _tag0_ instance of the _zed_ plugin are taken from this. However, if you run the code, you'll notice that it also picks up the options defined for the main _zed_ plugin. These become base defaults, so that the special case option, `red: 55` overrides the main value.


``` js
$ node zed-tag.js
zed undefined { red: 50, green: 100, blue: 150 }
zed tag0       { red: 55, green: 100, blue: 150 }
```


Sometimes you need to access to all the options provided to Seneca. For
example, there is a global _timeout_ value that you might want to
use for timeouts. The _transport_ family of plugins do this, see <a href="https://github.com/rjrodger/seneca-redis-transport/blob/master/redis-transport.js">redis-transport</a> for an example.



Inside your plugin function, you can call `this.options()`
to get back an object containing the entire Seneca options tree:


``` js
// zed-access.js
function zed( options ) {
  console.log( this.options() )
}

var seneca = require('../../../lib/seneca.js')()

seneca.use( zed )
```


Running this script produces:


```bash
$ node zed-access.js
{ ...
  timeout: 33333,
  ...
  zed: { red: 50, green: 100, blue: 150 },
  'zed$tag0': { red: 55 },
  ...
}
```


You are not required to use the _seneca.options.js_ file. If it exists, it will be loaded and used as the base default for options. You can specify your own configuration file (or an object containing option values), by providing an argument to `seneca.options()`. This is useful for different deployment scenarios. For example, the file _dev.options.js_ defines a custom configuration for the _zed_ plugin:


``` js
// dev.options.js
module.exports = {
  zed: {
    green: 110,
  }
}
```


The _zed-dev.js_ script uses this options file, but also gets the default options from _seneca.options.js_:


``` js
function zed( options ) {
  console.log( this.context.name, this.context.tag, options )
}

var seneca = require('seneca')()
seneca.options('./dev.options.js')

seneca.use( zed )
```


And the output has the overridden value for the `green` option.


```bash
$ node zed-dev.js
zed undefined { red: 50, green: 110, blue: 150 }
```



Finally, you can specify options on the command line, either via an argument, or an evironment variable. Here are some examples using the _zed-dev.js_ script. Use the `--seneca.options` command line argument to provide option values. You can use "dot notation" to specify nested options, and you can specify multiple options:


```bash
$ node zed-dev.js --seneca.options.zed.red=10 --seneca.options.zed.blue=200
zed undefined { red: 10, green: 110, blue: 200 }
```


Alternatively, you can use the environment variable `SENECA_OPTIONS` to specify options that will be merged into the base defaults (using `seneca.util.deepextend`). The format is <a href="https://github.com/rjrodger/jsonic">jsonic</a>, a lenient, abbreviated, fully compatible version of JSON for lazy developers.


```bash
$ SENECA_OPTIONS="{zed:{red:10,blue:200}}" node zed-dev.js
zed undefined { red: 10, green: 110, blue: 200 }
```


Command line options always override options from other sources. Here is the order of priority, from highest to lowest:

- Command line
- Environment variable
- Source code
- Custom options file
- Default options file
- Internal defaults
