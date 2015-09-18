---
layout: main.html
---


# Understanding Data Entities
The Seneca framework provides a data entity API based loosely on the <a href="http://www.martinfowler.com/eaaCatalog/activeRecord.html">ActiveRecord style</a>. Here's how it works.


## The Seneca Philosophy
The Seneca framework is defined by a philosophy that <a href="http://richardrodger.com">actions are better than objects</a>.



The only first-class citizens in the Seneca framework are _actions_. You register actions in Seneca by defining a set of key-value pairs that the action matches.
When a JSON document is submitted to Seneca, it triggers an action if a matching set of key-value pairs is found. The action returns another JSON document.



Actions can call other actions, and wrap existing actions. Groups of actions can work together to provide specific functionality, such as user management. Such groups are called _plugins_.
To keep things organized, a few conventions are used. A _role_ property identifies a specific area of functionality. A _cmd_ property identifies a specific action.



For example:


``` js
seneca.act( {role:'entity', cmd:'save', ent:{...}},
            function(err,result){ ... } )
```


This action will save data entities to persistent storage, as part of the group of actions that perform the _role_ of data persistence.
The _ent_ property is an object containing the data of the data entity to save.


In Seneca, data persistence is provided by a set of actions. These are:
`save`, `load`, `list`, `remove`. This provides a consistent interface for all other actions that need to persist data.



As convenience, these data entity actions are also available in the form of data entity objects, that expose the
_cmd's_ as methods - just like the ActiveRecord pattern. However, you cannot add business logic to these objects.
__Business logic belongs inside actions__.



## The Data Entity API


First you need a Seneca instance:


``` js
var seneca = require('seneca')()
```


Then you can create data entity objects:


``` js
var foo = seneca.make('foo')
```


The entity name is _foo_. If your underlying data store is
MongoDB, this data entity corresponds to the _foo_
collection. As a convenience, so you don't have to hook up a database, Seneca provides a transient in-memory store out of the
box (so you can just start coding!).



Next, add some data fields:


``` js
foo.name = 'Apple'
foo.price = 1.99
```


The data fields are just ordinary JavaScript object properties.



Now, you need to save the data:


``` js
foo.save$(function(err,foo){
  console.log(foo)
})
```


The `save$` method invokes the _role:entity, cmd:save_
action, passing in the foo object as the value of _ent_ argument.



The reason for the $ suffix is to namespace the _cmd_
methods. You can always be 100% certain that vanilla property names
"just work". Stick to alphanumeric characters and underscore and you'll be fine.



The `save$` method takes a callback, using the standard
Node.js idiom: The first parameter is an error object (if there was an
error), the second the result of the action. The `save$` method provides
a new copy of the foo entity. This copy has been saved to persistent
storage, and includes a unique _id_ property.



Once you've saved the data entity, you'll want to load it again at
some point. Use the `load$` method to do this, passing in
the _id_ property.



``` js
var id = '...'
var foo_entity = seneca.make('foo')
foo_entity.load$( id, function(err,foo){
  console.log(foo)
})
```


You can call the `load$` method on any data entity object
to load another entity of the same type. The original entity does
not change - you get the loaded entity back via the callback.


To delete entities, you also use the _id_ property, with the
`remove$` method:


``` js
var id = '...'
var foo_entity = seneca.make('foo')
foo_entity.remove$( id, function(err){ ... })
```


To get a list of entities that match a query, use
the `list$` method:


``` js
var foo_entity = seneca.make('foo')
foo_entity.list$( {price:1.99}, function(err,list){
  list.forEach(function( foo ){
    console.log(foo)
  })
})
```


The matching entities are returned as an array. The query is a set of
property values, all of which must match.  This is equivalent to a SQL
query of the form: ` col1 = 'val1' AND col2 = 'val2' AND ... `.
Seneca provides a common query format that works
across all data stores. The trade-off is that these queries have
limited expressiveness (more on this later, including the get-out-of-jail options).



One thing you can do is sort the results:


``` js
foo_entity.list$( {price:1.99, sort$:{price:-1}}, function(err,list){
  ...
})
```


The `sort$` meta argument takes a sub-object containing a single key, the field to sort. The value `+1` means sort ascending,
and the value `-1` means sort descending. The common query format only accepts a sort by one field.



You can also use queries with the `load$` and `remove$` methods. The first matching entity is selected.


## Zone, Base and Name: The Entity Namespace


Your data can live in many different places. It can be persistent or transient. It may have business rules that apply to it.
It may be owned by different people.



Seneca lets you work with your data, without worrying about where it
lives, or what rules should apply to it. This makes it easy to handle
different types of data in different ways. To make this easier, Seneca provides a three layer namespace for data entities:


<ul>
<li>_name_: the primary name of the entity. For example: _product_</li>
<li>_base_: group name for entities that "belong together". For example: _shop_</li>
<li>_zone_: name for a data set belonging to a business entity, geography, or customer. For example: _tenant001_</li>
</ul>


The zone and base are optional. You can just use the name element in the same way you use ordinary database tables, and you'll be just fine.
Here's an example of creating a _foo_ entity (as seen above):


``` js
var foo_entity = seneca.make('foo')
```


Often, a set of plugins that provide the related functions, will use
the same _base_. This ensures that the entities used by these
plugins won't interfere with your own entities.



For example, the <a href="https://github.com/rjrodger/seneca-user">user</a>
and <a href="https://github.com/rjrodger/seneca-auth">auth</a> plugins,
which handle user accounts, and login/logout, use the _sys_ base,
and work with the following entities:


``` js
var sys_user  = seneca.make('sys','user')
var sys_login = seneca.make('sys','login')
```


The underlying database needs to have a name for the table or
collection associated with an entity. The convention is to join the
base and name with an underscore, as `'_'` is accepted by most database
systems as a valid name character.  This means that _name_, _base_ and
_zone_ values should only be alphanumeric, and to be completely safe,
should never start with a number.



For the above plugins, the table or collection names would be:
`sys_user` and `sys_login`.



The _zone_ element provides a higher level namespace that Seneca itself does not
use. It is merely a placeholder for your own needs.  For example, you
may need to isolate customer data into separate physical databases.



The zone is never part of the database table name. You use it by
registering multiple instances of the same database plugin, pointing
at different physical databases. Seneca's pattern matching makes this
automatic for you (see the entity type mapping examples below).



You can also use the zone for custom business rules. The zone, base and name appear as action arguments - just pattern match the underlying actions! (and there are examples below).


<h5>Creating an Entity with a Specific Zone, Base and Name</h5>


The _make_ method is available on both the main Seneca object, and on each entity object (where it always has a $ suffix):


``` js
// the alias make$ will also work
var foo = seneca.make('foo')

// make() does not exist to avoid property clashes
var bar = foo.make$('bar')
```


It optionally accepts up to three string arguments, specifying the zone, base and name, always in that order:


``` js
var foo = seneca.make('foo')
var bar_foo = seneca.make('bar','foo')
var zen_bar_foo = seneca.make('zen','bar','foo')
```


When no arguments are given, calling `make$` on an entity will create a new instance of the same kind (same zone, base and name):


``` js
var foo = seneca.make('foo')
var morefoo = foo.make$()
```


No data is copied, you get a completely new, empty, data entity (use `clone$` instead to copy the data).
If you pass in an object as the last argument to `make$`, it will be used to initialize the entity data fields:


``` js
var foo = seneca.make('foo', {price:1.99,color:'red'})
console.log('price is '+foo.price+' and color is '+foo.color)
```



If you call the `toString` method on an entity, it will indicate the zone, base and name using the syntax _zone/base/name_ as a prefix to the entity data:


{% highlight text %}
$zone/base/name:{id=...;prop=val,...}
```


If any of the namespace elements are not defined, a minus `'-'` is used as placeholder:


{% highlight text %}
$-/-/name:{id=...;prop=val,...}
```


The syntax _zone/base/name_ is also used a shorthand for an
entity type pattern. For example, _-/bar/-_ means any entities
that have base _bar_.


## Using Databases to Store Entity Data


To store persistent data, you'll need to use an external
database. Each database needs a plugin that understands how to talk to
that database. The plugins normally use a specific driver module to do the actual talking.



For example, the <a href="https://github.com/rjrodger/seneca-mongo-store">seneca-mongo-driver</a> plugin
uses the <a href="http://mongodb.github.io/node-mongodb-native/">mongodb</a> module.



Using a data store plugin is easy. Register with Seneca and supply the database connection details as options to the plugin:


``` js
var seneca = require('seneca')()
seneca.use('mongo-store',{
  name:'dbname',
  host:'127.0.0.1',
  port:27017
})
```


The database connection will need to be established before you can
save data. Use the `seneca.ready` function to supply a
callback that will be called once the database is good to go:


``` js
seneca.ready(function(err){
  var apple = seneca.make$('fruit')
  apple.name  = 'Pink Lady'
  apple.price = 1.99
  apple.save$(function(err,apple){
    if( err ) return console.log(err);
    console.log( "apple = "+apple  )
  })
})
```


The `seneca.ready` function works for any plugin that has a callback dependency
like this - it will only be triggered once all the plugins are ready.



To close any open database connections, use the `seneca.close` method:


``` js
seneca.close(function(err){
  console.log('database closed!')
})
```


<h5>Data Store Plugins</h5>


To use a data store plugin, you'll normally need to install the module via npm:


{% highlight bash %}
npm install seneca-mongo-store
```


The data store plugins use a naming convention of the form seneca-_database_-store. The suffix _db_ is dropped. Here are some of the existing data store plugins:


<ul>
  </li><li>JSON files (on disk) - <a href="http://github.com/rjrodger/seneca-jsonfile-store">seneca-jsonfile-store</a>
  </li><li>MongoDB - <a href="http://github.com/rjrodger/seneca-mongo-store">seneca-mongo-store</a>
  </li><li>MySQL - <a href="https://github.com/mirceaalexandru/seneca-mysql-store">seneca-mysql-store</a>
  </li><li>PostgreSQL - <a href="https://github.com/marianr/seneca-postgres-store">seneca-postgres-store</a>
  </li><li>levelDB - <a href="https://github.com/rjrodger/seneca-level-store">seneca-level-store</a>
</li></ul>


Refer to their project pages for details on behaviour and configuration options. As a convenience, Seneca allows you to drop the _seneca-_ prefix when registering the plugin:


``` js
seneca.use('mongo-store',{ ... })
```


The default, built-in data store is _mem-store_, which provides a
transient in-memory store. This is very useful for quick prototyping
and allows you to get started quickly. By sticking to the common
entity feature set (see below), you can easily swap over to a real database at a
later point.



If you'd like to add support for a database to Seneca,
here's the <a href="/data-store-guide.html">guide to writing data store plugins</a>



<h5>Mapping Entities to Data Stores</h5>


One of the most useful features of the Seneca data entity model is the
ability to transparently use different databases. This is enabled by
the use of Seneca actions for all the underlying operations. This
makes it easy to pattern match against specific entity zones, bases
and names and send them to different data stores.



You can use the _map_ option when registering a data store plugin
to specify the data entity types that it should support. All others will be ignored.



The map is a set of key-value pairs, where the key is an entity type
pattern, and the value a list of entity _cmd_s
(such as _save_,_load_,_list_,_remove_,...),
or `'*'`, which means the mapping applies to all _cmd_s.



The example mapping below means that all entities with the name _tmp_,
regardless of zone or base, will use the transient _mem-store_:


``` js
seneca.use('mem-store',{ map:{
  '-/-/tmp':'*'
}})
```


To use different databases for different groups of data, use the _base_ element:


``` js
seneca.use('jsonfile-store',{
  folder:'json-data', map:{'-/json/-':'*'}
})

seneca.use('level-store',{
  folder:'level-data', map:{'-/level/-':'*'}
})
```


This mapping sends -/json/- entities to
the <a href="https://github.com/rjrodger/seneca-jsonfile-store">jsonfile</a>
data store, and -/level/- entities to
the <a href="https://github.com/rjrodger/seneca-level-store">leveldb</a>
data store.



Here it is in action:

``` js
seneca.ready(function(err,seneca){

  ;seneca
    .make$('json','foo',{propA:'val1',propB:'val2'})
    .save$(function(err,json_foo){
      console.log(''+json_foo)

  ;seneca
    .make$('level','bar',{propA:'val3',propB:'val4'})
    .save$(function(err,level_bar){
      console.log(''+level_bar)

  }) })
})
```


The full source code is available in the data-entities folder of the <a href="https://github.com/rjrodger/seneca-examples">seneca examples repository</a>.
(The ; prefix is just a marker to avoid excessive indentation)


## Data Store Logging



You can track and debug the activity of data entities by reviewing the action log, and the plugin log for the datastore.



For example, run the example above, that uses both the jsonfile store and the leveldb store, using the `--seneca.log=type:act` log filter, and you get the output:


{% highlight bash %}
$ node main.js --seneca.log=type:act
...
2013-04-18T10:05:45.818Z	DEBUG	act	jsonfile-store	BCL	wa8xc5	In	{cmd=save,role=entity,ent=$-/json/foo:{id=;propA=val1;propB=val2},name=foo,base=json}	gx38qi
2013-04-18T10:05:45.821Z	DEBUG	act	jsonfile-store	BCL	wa8xc5	OUT	[$-/json/foo:{id=ulw8ew;propA=val1;propB=val2}]	gx38qi
...
2013-04-18T10:05:45.822Z	DEBUG	act	level-store	GPN	8dnjyt	IN	{cmd=save,role=entity,ent=$-/level/bar:{id=;propA=val3;propB=val4},name=bar,base=level}	8ml1p7
2013-04-18T10:05:45.826Z	DEBUG	act	level-store	GPN	8dnjyt	OUT	[$-/level/bar:{id=7de92fc0-f402-411d-80ea-59e435a8c398;propA=val3;propB=val4}]	8ml1p7
...
```


This shows the _role:entity, cmd:save_ action of both data
stores. Seneca actions use a JSON-in/JSON-out model. You can trace
this using the `IN` and `OUT` markers in the log
entries. The `IN` and `OUT` entries are connected by an action identifer, such as _wa8xc5_.
This lets you trace actions when they interleave asynchronously.



The `IN` log entries show the action arguments, including the entity data, and the entity zone, base and name (if defined).
Once the action completes, the `OUT` log entries show the returned data. In particular, notice that the entities now have generated _id_s.



The data stores themselves also generate logging output. Try `--seneca.log=type:plugin` to see this:


{% highlight bash %}
$ node main.js --seneca.log=type:plugin
2013-04-18T10:39:54.961Z	DEBUG	plugin	jsonfile-store	QSG	cop6lx	save/insert	$-/json/foo:{id=nt7usm;propA=val1;propB=val2}	jsonfile-store~QSG~-/json/-
2013-04-18T10:40:19.802Z	DEBUG	plugin	level-store	JNG	save/insert	$-/level/bar:{id=7166037e-112d-448c-9afa-84e69d84aa25;propA=val3;propB=val4}	level-store~JNG~-/level/-
```


In this case, the data stores creates a log entry for each save operation that inserts data. The entity data is also shown.
Each plugin instance gets a three letter tag, such as `QSG`, or `JNG`. This helps you distinguish between multiple mappings that use the same data store.
Each data store plugin instance can be ths be described by the name of the data store plugin, the tag, and the associated mapping. This is the last element of the log entry. For example:
`level-store~JNG~-/level/-`




<!--


- caching
- api coverage
  - standard data interface / common entity feature set
- underlying actions
- native
- extending

-->

<br /><br /><br />

That's all folks! Corrections and comments: please tweet <a href="https://twitter.com/senecajs">@senecajs</a>.
