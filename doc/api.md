---
layout: main.html
---

# API Reference
Seneca's API is pretty tiny, we try hard to keep any non essential functionality out of core, instead pushing it
out to plugins. The core API documented in full below. If you have any further questions [get in touch](), we
love to talk!

## use (name [, options])
- __name:__ - `string`: name of the plugin, used to build argument to require function.
- __options:__ - `object`: optional, options for the plugin, contents depend on plugin.

The use method loads and registers plugins. You can refer to built-in plugins by name directly, for example:
echo, options, mem-store, etc. External plugins need to be installed with npm install first, and then you can
refer to them using their npm module name. As a convenience, you can omit the seneca- prefix on standard plugins.

___Example: registering the built-in mem-store plugin with custom options___
``` js
seneca.use('mem-store', {
  web:{
    dump:true
  }
})
```

The second argument to the use method is an options object containing configuration properties specific to the plugin. Refer to the documentation for each plugin to find out how to use them. If you're using the options
plugin, properties in the options argument will override options loaded externally.

## ready (ready)
- __ready__ - `function(err)`: callback to execute after all plugins initialize.

Each plugin can optionally define an action with the pattern init:name. If this action is defined, it will be
called in series, in order, for any plugins that define it. You can ensure that database connections and other
external dependencies are in place before using them. Just a reminder: the order of plugin registration is
significant!

This method takes a callback function as an argument. Inside this callback is where you would normally complete
the initialization of other parts of your app, such as setting up express.

___Example: waiting for the database connection before inserting data___
``` js
seneca.use('mongo-store', {...})

seneca.ready(function (err) {
  // handle err / start inserting data.
})
```

You can call ready more than once. If you need to register additional plugins dynamically (this is perfectly
fine!), you can call ready again to wait for the new plugins to initialize. Seneca also emits a 'ready' event,
which you can use instead of this function:

___Example: adding callback for the ready event, emitted by Seneca___
``` js
seneca.on('ready', function (err) {...})
```

They both achieve the same result, it's simply a matter of preference which you choose to use.

## add (pattern [, paramspec], action)
- __pattern__ - `object` or `string`: matching the the pattern specification
- __paramspec__ - `object`: matching the parameter specification
- __action__: `function(...)`: matching the action signature

Add an action to the Seneca instance. You provide a key/value pair pattern that Seneca will match against objects
that are submitted using the add method. When an object is submitted, Seneca will check the object's top-level
properties in alphabetical order to see if there is a matching action.

The action is a function that accepts two arguments. The first is the object that was submitted, and the second
is a callback that you should call once your action has completed it's work. The callback has the standard
signature function( err, result ). The callback must always be called, especially to report errors. The action
result is optional, and you do not have to supply one if it does not make sense for your action.

___Example: defining an action___
``` js
seneca.add({foo:'bar'}, function (args, done) {
  done( null,{zoo:args.zoo})
})

seneca.act({foo:'bar', zoo:'qaz'}, function (err, out) {
  console.log( out.zoo )
})
```

You can define actions at any time, any where. They don't need to be associated with a plugin. Actions defined
inside a plugin do get some logging meta-data however, so they're easier to manage in the long run.

## act (input [, callback])
- __input:__ object, properties to be matched against previously added action patterns
- __callback:__ function, optional (<a href="desc-result-signature">result signature</a>)

notes

## make (entity-canon [, properties])
- __entity-canon__ - `string`: see [Entity Cannon](/entity-canon-format) for info.
- __properties__ - `object`: optional, default data for the new entity.

This method creates new entities using the built in [Data Entity]() functionality. The `entity-canon` string
is documented in [Entity Cannon Format]() but is essentially a namespaced way to refer to the same type or
shape of object for the purposes of storage.

```js
var stockItem = seneca.make('stock-item')
stockItem.price = 1.22
stockItem.quantity = 22
```

A set of default or preset options can be passed to the above method to create a pre-populated object.

```js
var stockItem = seneca.make('stock-item', {
  stockItem.price = 0.00  
  stockItem.quantity = 0
})

```

## export (name)
- __name:__ string, reference to plugin provided object

notes...

## pin (pin-pattern)
- __pin-pattern:__ object or string (<a href="desc-pin-pattern-format">pin pattern format</a>)

notes...

## log._level_([entry, ..])
- __entry:__ JavaScript value, converted to string

notes...

## close ([done])
- __done:__ function, optional, callback with signature function(err), called after all close actions complete.

notes...

## client (options)
- __options:__ object, transport options

notes...

## listen (options)
- __options__  - `object`: transport options

The listen method tells the underlying transport to start listening for traffic. This method is usually called last
after you have finished any setup and have loaded all plugins. The built in transport supports HTTP and TCP. The
default port is set to `10101`, the default transit type is HTTP.

___Example: calling listen on port 10101 over http___
```js
seneca.ready(function (err) {
  if (err) return

  seneca.listen()
})
```

The options object for this method allows the `type`, `host` and `port` settings for the default transport to be
set. The exact options needed will vary by transport plugin, if you are using a custom transport, consult it's
documentation the the options available.

___Example: calling listen on a custom host and port over tcp___
```js
seneca.ready(function (err) {
  if (err) return

  seneca.listen({
    type: 'tcp',
    host: '192.168.1.200',
    port: '4050'
  })
})
```

Seneca allows multiple transport types to be ran simultaneously over different ports. This allows the greatest
flexibility to clients with minimal setup.
