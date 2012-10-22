# seneca - Node.js module

## A Node.js toolkit for startups building Minimum Viable Products

This is a community project of the http://nodejsdublin.com meetup.

Seneca is a toolkit for organizing the business logic of your app. You
can break down your app into "stuff that happens", rather than
focusing on data models or managing dependencies.

For a gentle introduction to this module, see the [senecajs.org](http://senecajs.org) site.


If you're using this module, feel free to contact us on twitter if you have any questions! :) [@nodejsdublin](http://twitter.com/nodejsdublin)

Current Version: 0.4.1

Tested on: node 0.8.6


Use this module to define commands that work by taking in some JSON, and returning some JSON. The command to run is selected by pattern-matching on the the input JSON.
There are built-in and optional sets of commands that help you build Minimum Viable Products: data storage, user management, distributed logic, caching, logging, etc.
And you can define your own product by breaking it into a set of commands - "stuff that happens".

That's pretty much it.


_Why do this?_

It doesn't matter,

   * who provides the functionality,
   * where it lives (on the network),
   * what it depends on,
   * it's easy to define blocks of functionality (plugins!).

So long as _some_ command can handle a given JSON document, you're good.

Here's an example:

```javascript
var seneca = require('seneca')()

seneca.add( {cmd:'sales-tax'}, function(args,callback){
  var rate  = 0.23
  var total = args.net * (1+rate)
  callback(null,{total:total})
})

seneca.act( {cmd:'salestax', net:100}, function(err,result){
  console.log( result.total )
})
```

In this code, whenever seneca sees the pattern
<code>{cmd:'sales-tax'}</code>, it executes the function associated
with this pattern, which calculates sales tax. Yah!

The _seneca.add_ method adds a new pattern, and the function to execute whenever that pattern occurs.

The _seneca.act_ method accepts an object, and runs the command, if any, that matches.

Where does the sales tax rate come from? Let's try it again:

```javascript
seneca.add( {cmd:'config'}, function(args,callback){
  var config = {
    rate: 0.23
  }
  var value = config[args.prop]
  callback(null,{value:value})
})

seneca.add( {cmd:'salestax'}, function(args,callback){
  seneca.act( {cmd:'config', prop:'rate'}, function(err,result){
    var rate  = parseFloat(result.value)
    var total = args.net * (1+rate)
    callback(null,{total:total})
  })
})

seneca.act( {cmd:'salestax', net:100}, function(err,result){
  console.log( result.total )
})
```

The _config_ command provides you with your configuration. This is
cool because it doesn't matter _where_ it gets the configuration from - hard-coded, file system, database, network service, whatever. Did
you have to define an abstraction API to make this work? Nope.

There's a little but too much verbosity here, don't you think? Let's fix that:


```javascript
var shop = seneca.pin({cmd:'*'})

shop.salestax({net:100}, function(err,result){
  console.log( result.total )
})
```

By _pinning_ a pattern, you get a little API of matching function calls.
The _shop_ object gets a set of methods that match the pattern: _shop.salestax_ and _shop.config_.


_Programmer Anarchy_

The way to build Node.js systems, is to build lots of little
processes. Here's a great talk explaining why you should do this:
[Programmer Anarchy](http://vimeo.com/43690647).

Seneca makes this really easy. Let's put configuration out on the network into it's own process:

```javascript
seneca.add( {cmd:'config'}, function(args,callback){
  var config = {
    rate: 0.23
  }
  var value = config[args.prop]
  callback(null,{value:value})
})


seneca.use('transport')

var connect = require('connect')
var app = connect()
  .use( connect.json() )
  .use( seneca.service() )
  .listen(10171)
```

The _transport_ plugin exposes any commands over a HTTP end point. You
can then use the _connect_ module, for example, to run a little web
server. The _seneca.service_ method returns a _connect_ middleware
function to do this.

Your implementation of the configuration code _stays the same_.

The client code looks like this:


```javascript
seneca.use('transport',{
  pins:[ {cmd:'config'} ]
})

seneca.add( {cmd:'salestax'}, function(args,callback){
  seneca.act( {cmd:'config', prop:'rate'}, function(err,result){
    var rate  = parseFloat(result.value)
    var total = args.net * (1+rate)
    callback(null,{total:total})
  })
})

var shop = seneca.pin({cmd:'*'})

shop.salestax({net:100}, function(err,result){
  console.log( result.total )
})
```

On the client-side, the _transport_ plugin takes a _pins_
parameter. You can use this to specify which patterns are remote.

Again, notice that your sales tax code _does not change_. It does not
need to know where the configuration comes from, who provides it, or
how.

You can do this with every command.


_Keeping the Business Happy_

The thing about business requirements is that have no respect for
command sense, logic or orderly structure. The real world is
messy. 

In our example, let's say some countries have single sales tax rate,
and others have a variable rate, which depends either on locality, or product category.

Here's the code. We'll rip out the configuration code for this example.

```javascript
// fixed rate
seneca.add( {cmd:'salestax'}, function(args,callback){
  var rate  = 0.23
  var total = args.net * (1+rate)
  callback(null,{total:total})
})


// local rates
seneca.add( {cmd:'salestax',country:'US'}, function(args,callback){
  var state = {
    'NY': 0.04,
    'CA': 0.0625
    // ...
  }
  var rate = state[args.state]
  var total = args.net * (1+rate)
  callback(null,{total:total})
})


// categories
seneca.add( {cmd:'salestax',country:'IE'}, function(args,callback){
  var category = {
    'top': 0.23,
    'reduced': 0.135
    // ...
  }
  var rate = category[args.category]
  var total = args.net * (1+rate)
  callback(null,{total:total})
})


var shop = seneca.pin({cmd:'*'})

shop.salestax({net:100,country:'DE'}, function(err,result){
  console.log( 'DE: '+result.total )
})

shop.salestax({net:100,country:'US',state:'NY'}, function(err,result){
  console.log( 'US,NY: '+result.total )
})

shop.salestax({net:100,country:'IE',category:'reduced'}, function(err,result){
  console.log( 'IE: '+result.total )
})

```

In this case, you provide different implementations for different
patterns. This lets you isolate complexity into well-defined
places. It also means you can deal with special cases very easily.


# Stay tuned...

More to come...



### Acknowledgements

This module depends on many, many Node.js modules - thank you!

Development is sponsored by [nearForm](http://nearform.com)

<img src="http://www.nearform.com/img/sponsored-by-nearform.png" width="300">



