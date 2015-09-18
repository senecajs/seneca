---
layout: main.html
---

# Plugins
___Seneca___ is nothing without plugins, plugins are how we enable you to build awesome microservices, incredibly
fast. Some plugins are maintained in-house, others provided by the community. We provide an npm link and
total downloads per month for any plugins we find or publish ourselves so you only need to look in one place.

## Core Plugins
We include a couple of plugins with Seneca by default in other to ensure you can create a working microservice
out of the box, don't worry, it's not many!

#### [Web](https://npmjs.org/package/seneca-web)
[![version][web-npm-version]][web-npm-url]
[![downloads][web-npm-downloads]][web-npm-url]
[web-npm-version]: https://img.shields.io/npm/v/seneca-web.svg?style=flat-square
[web-npm-downloads]: https://img.shields.io/npm/dm/seneca-web.svg?style=flat-square
[web-npm-url]: https://npmjs.org/package/seneca-web

Provides a web service API routing layer for Seneca action patterns. It translates HTTP requests with specific
URL routes into action pattern calls. It's a built-in dependency of the Seneca module, so you don't need to
include it manually.

#### [Transport](https://npmjs.org/package/seneca-transport)
[![version][transport-npm-version]][transport-npm-url]
[![downloads][transport-npm-downloads]][transport-npm-url]
[transport-npm-version]: https://img.shields.io/npm/v/seneca-transport.svg?style=flat-square
[transport-npm-downloads]: https://img.shields.io/npm/dm/seneca-transport.svg?style=flat-square
[transport-npm-url]: https://npmjs.org/package/seneca-transport

Provides the HTTP and TCP transport channels for microservice messages. It's a built-in dependency of the Seneca
module, so you don't need to include it manually.

## Feature Plugins
Use these these plugins to kick-start your application development. They provide the basic business logic for
many common use cases, like user accounts, shopping carts, or administration.  You can customize their behavior
by overriding their actions.

#### [User](https://npmjs.org/package/seneca-user)
[![version][user-npm-version]][user-npm-url]
[![downloads][user-npm-downloads]][user-npm-url]
[user-npm-version]: https://img.shields.io/npm/v/seneca-user.svg?style=flat-square
[user-npm-downloads]: https://img.shields.io/npm/dm/seneca-user.svg?style=flat-square
[user-npm-url]: https://npmjs.org/package/seneca-user

Provides business logic for complete user management, such as login, logout, registration and password
handling, using Seneca's expressive action based API. This module compliments

#### [Auth](https://npmjs.org/package/seneca-auth)
[![version][auth-npm-version]][auth-npm-url]
[![downloads][auth-npm-downloads]][auth-npm-url]
[auth-npm-version]: https://img.shields.io/npm/v/seneca-auth.svg?style=flat-square
[auth-npm-downloads]: https://img.shields.io/npm/dm/seneca-auth.svg?style=flat-square
[auth-npm-url]: https://npmjs.org/package/seneca-auth

Provides the business logic for authentication via HTTP. Adds the ability to set up simple win/fail
style conditions. The user plugin complements this one nicely.

#### [JSON REST API](https://npmjs.org/package/seneca-jsonrest-api)
[![version][jsonrest-npm-version]][jsonrest-npm-url]
[![downloads][jsonrest-npm-downloads]][jsonrest-npm-url]
[jsonrest-npm-version]: https://img.shields.io/npm/v/seneca-jsonrest-api.svg?style=flat-square
[jsonrest-npm-downloads]: https://img.shields.io/npm/dm/seneca-jsonrest-api.svg?style=flat-square
[jsonrest-npm-url]: https://npmjs.org/package/seneca-jsonrest-api

Provides the ability to expose your data entities as a REST API. Works via pattern matching actions to HTTP
verbs. Removes the need for additional plumbing to expose entities as resources.

#### [Data Editor](https://npmjs.org/package/seneca-data-editor)
[![version][data-editor-npm-version]][data-editor-npm-url]
[![downloads][data-editor-npm-downloads]][data-editor-npm-url]
[data-editor-npm-version]: https://img.shields.io/npm/v/seneca-data-editor.svg?style=flat-square
[data-editor-npm-downloads]: https://img.shields.io/npm/dm/seneca-data-editor.svg?style=flat-square
[data-editor-npm-url]: https://npmjs.org/package/seneca-data-editor

Provides a administrative interface for editing all the data in your system.This module can be used in a
standalone fashion, but also pairs well with seneca-admin. Inspired by the Django admin interface.

#### [Admin](https://npmjs.org/package/seneca-admin)
[![version][admin-npm-version]][admin-npm-url]
[![downloads][admin-npm-downloads]][admin-npm-url]
[admin-npm-version]: https://img.shields.io/npm/v/seneca-admin.svg?style=flat-square
[admin-npm-downloads]: https://img.shields.io/npm/dm/seneca-admin.svg?style=flat-square
[admin-npm-url]: https://npmjs.org/package/seneca-admin

Provides an administration console that returns interesting data about your microservice including
streaming log, status summaries and action patterns. Can be locked to admin for safety purposes.

#### [Email](https://npmjs.org/package/seneca-mail)
[![version][mail-npm-version]][mail-npm-url]
[![downloads][mail-npm-downloads]][mail-npm-url]
[mail-npm-version]: https://img.shields.io/npm/v/seneca-mail.svg?style=flat-square
[mail-npm-downloads]: https://img.shields.io/npm/dm/seneca-mail.svg?style=flat-square
[mail-npm-url]: https://npmjs.org/package/seneca-mail

Provides email delivery business logic, including the ability to have templates. Works with many
different providers. Works well with the User plugin for handling things like welcome mails and
password reminders.

#### [Account](https://npmjs.org/package/seneca-account)
[![version][account-npm-version]][account-npm-url]
[![downloads][account-npm-downloads]][account-npm-url]
[account-npm-version]: https://img.shields.io/npm/v/seneca-account.svg?style=flat-square
[account-npm-downloads]: https://img.shields.io/npm/dm/seneca-account.svg?style=flat-square
[account-npm-url]: https://npmjs.org/package/seneca-account

Provides a user account system for the management of multiple users in a account. Handles account creation
and management and user management within a given account. The User plugin compliments this one nicely.

#### [Project](https://npmjs.org/package/seneca-project)
[![version][project-npm-version]][project-npm-url]
[![downloads][project-npm-downloads]][project-npm-url]
[project-npm-version]: https://img.shields.io/npm/v/seneca-project.svg?style=flat-square
[project-npm-downloads]: https://img.shields.io/npm/dm/seneca-project.svg?style=flat-square
[project-npm-url]: https://npmjs.org/package/seneca-project

Provides all the actions needed to manage a project. Use this plugin to build out microservices
that have the concept of ownership, grouping, starting and stopping or loading of some type of work. Works
well with the accounts plugin.

#### [Perm](https://npmjs.org/package/seneca-perm)
[![version][perm-npm-version]][perm-npm-url]
[![downloads][perm-npm-downloads]][perm-npm-url]
[perm-npm-version]: https://img.shields.io/npm/v/seneca-perm.svg?style=flat-square
[perm-npm-downloads]: https://img.shields.io/npm/dm/seneca-perm.svg?style=flat-square
[perm-npm-url]: https://npmjs.org/package/seneca-perm

Provides a permissions system for actions.This plugin works by wrapping existing actions with a permission
checking action. If the permission test passes, the parent action can proceed. If not, a permission error
is generated.

#### [VCache](https://npmjs.org/package/seneca-vcache)
[![version][vcache-npm-version]][vcache-npm-url]
[![downloads][vcache-npm-downloads]][vcache-npm-url]
[vcache-npm-version]: https://img.shields.io/npm/v/seneca-vcache.svg?style=flat-square
[vcache-npm-downloads]: https://img.shields.io/npm/dm/seneca-vcache.svg?style=flat-square
[vcache-npm-url]: https://npmjs.org/package/seneca-vcache

Provides a data caching mechanism for data entities. Using this module will give your Seneca app a big
performance boost. The caching mechanism goes beyond simple key-based caching using memcached. In addition,
a smaller "hot" cache is maintained within the Node process. Data entities are given transient version numbers,
and these are used to synchronize the hot cache with memcached.

#### [Cart](https://npmjs.org/package/seneca-cart)
[![version][cart-npm-version]][cart-npm-url]
[![downloads][cart-npm-downloads]][cart-npm-url]
[cart-npm-version]: https://img.shields.io/npm/v/seneca-cart.svg?style=flat-square
[cart-npm-downloads]: https://img.shields.io/npm/dm/seneca-cart.svg?style=flat-square
[cart-npm-url]: https://npmjs.org/package/seneca-cart

Provides complete shopping cart management business logic. This plugin works really well with the built in
data entity api. Adds actions for adding, removing and editing items in a container (cart).

#### [Pay](https://npmjs.org/package/seneca-pay)
[![version][pay-npm-version]][pay-npm-url]
[![downloads][pay-npm-downloads]][pay-npm-url]
[pay-npm-version]: https://img.shields.io/npm/v/seneca-pay.svg?style=flat-square
[pay-npm-downloads]: https://img.shields.io/npm/dm/seneca-pay.svg?style=flat-square
[pay-npm-url]: https://npmjs.org/package/seneca-pay

Provides all the necessary components to build payments into your microservice. Includes support for Paypal
express payments in the box. Makes setting up payment redirects a breeze.

#### [CMS](https://npmjs.org/package/seneca-cms)
[![version][cms-npm-version]][cms-npm-url]
[![downloads][cms-npm-downloads]][cms-npm-url]
[cms-npm-version]: https://img.shields.io/npm/v/seneca-cms.svg?style=flat-square
[cms-npm-downloads]: https://img.shields.io/npm/dm/seneca-cms.svg?style=flat-square
[cms-npm-url]: https://npmjs.org/package/seneca-cms

Provides a simple content management system. Use to create a more specialized system that fits your needs.
Handles the management of unique entities in a system in a more coarse fashion than using the Entity API
directly (which is used internally by this plugin).

#### [Settings](https://npmjs.org/package/seneca-settings)
[![version][settings-npm-version]][settings-npm-url]
[![downloads][settings-npm-downloads]][settings-npm-url]
[settings-npm-version]: https://img.shields.io/npm/v/seneca-settings.svg?style=flat-square
[settings-npm-downloads]: https://img.shields.io/npm/dm/seneca-settings.svg?style=flat-square
[settings-npm-url]: https://npmjs.org/package/seneca-settings

Settings rich settings for user accounts, can handle many different types of values including ratings,
toggles, colors and ranges.

## Storage Plugins
Storage plugins work with our built-in [Entity API](). Storage plugins can be used on a per entity
basis so feel free to mix and match. Each plugin is named after the storage it supports, making finding
the right solution a simple task.

#### [Mongo Store](https://npmjs.org/package/seneca-mongo-store)
[![version][mongo-store-npm-version]][mongo-store-npm-url]
[![downloads][mongo-store-npm-downloads]][mongo-store-npm-url]
[mongo-store-npm-version]: https://img.shields.io/npm/v/seneca-mongo-store.svg?style=flat-square
[mongo-store-npm-downloads]: https://img.shields.io/npm/dm/seneca-mongo-store.svg?style=flat-square
[mongo-store-npm-url]: https://npmjs.org/package/seneca-mongo-store

#### [Postgres Store](https://npmjs.org/package/seneca-postgres-store)
[![version][postgres-store-npm-version]][postgres-store-npm-url]
[![downloads][postgres-store-npm-downloads]][postgres-store-npm-url]
[postgres-store-npm-version]: https://img.shields.io/npm/v/seneca-postgres-store.svg?style=flat-square
[postgres-store-npm-downloads]: https://img.shields.io/npm/dm/seneca-postgres-store.svg?style=flat-square
[postgres-store-npm-url]: https://npmjs.org/package/seneca-postgres-store

#### [MySQL Store](https://npmjs.org/package/seneca-mysql-store)
[![version][mysql-store-npm-version]][mysql-store-npm-url]
[![downloads][mysql-store-npm-downloads]][mysql-store-npm-url]
[mysql-store-npm-version]: https://img.shields.io/npm/v/seneca-mysql-store.svg?style=flat-square
[mysql-store-npm-downloads]: https://img.shields.io/npm/dm/seneca-mysql-store.svg?style=flat-square
[mysql-store-npm-url]: https://npmjs.org/package/seneca-mysql-store

#### [Level Store](https://npmjs.org/package/seneca-level-store)
[![version][level-store-npm-version]][level-store-npm-url]
[![downloads][level-store-npm-downloads]][level-store-npm-url]
[level-store-npm-version]: https://img.shields.io/npm/v/seneca-level-store.svg?style=flat-square
[level-store-npm-downloads]: https://img.shields.io/npm/dm/seneca-level-store.svg?style=flat-square
[level-store-npm-url]: https://npmjs.org/package/seneca-level-store

#### [JSON File Store](https://npmjs.org/package/seneca-jsonfile-store)
[![version][jsonfile-store-npm-version]][jsonfile-store-npm-url]
[![downloads][jsonfile-store-npm-downloads]][jsonfile-store-npm-url]
[jsonfile-store-npm-version]: https://img.shields.io/npm/v/seneca-jsonfile-store.svg?style=flat-square
[jsonfile-store-npm-downloads]: https://img.shields.io/npm/dm/seneca-jsonfile-store.svg?style=flat-square
[jsonfile-store-npm-url]: https://npmjs.org/package/seneca-jsonfile-store

#### [Redis Store](https://npmjs.org/package/seneca-redis-store)
[![version][redis-store-npm-version]][redis-store-npm-url]
[![downloads][redis-store-npm-downloads]][redis-store-npm-url]
[redis-store-npm-version]: https://img.shields.io/npm/v/seneca-redis-store.svg?style=flat-square
[redis-store-npm-downloads]: https://img.shields.io/npm/dm/seneca-redis-store.svg?style=flat-square
[redis-store-npm-url]: https://npmjs.org/package/seneca-redis-store

#### [Dynamo Store](https://npmjs.org/package/seneca-dynamo-store)
[![version][dynamo-store-npm-version]][dynamo-store-npm-url]
[![downloads][dynamo-store-npm-downloads]][dynamo-store-npm-url]
[dynamo-store-npm-version]: https://img.shields.io/npm/v/seneca-dynamo-store.svg?style=flat-square
[dynamo-store-npm-downloads]: https://img.shields.io/npm/dm/seneca-dynamo-store.svg?style=flat-square
[dynamo-store-npm-url]: https://npmjs.org/package/seneca-dynamo-store

#### [HANA Store](https://npmjs.org/package/seneca-hana-store)
[![version][hana-store-npm-version]][hana-store-npm-url]
[![downloads][hana-store-npm-downloads]][hana-store-npm-url]
[hana-store-npm-version]: https://img.shields.io/npm/v/seneca-hana-store.svg?style=flat-square
[hana-store-npm-downloads]: https://img.shields.io/npm/dm/seneca-hana-store.svg?style=flat-square
[hana-store-npm-url]: https://npmjs.org/package/seneca-hana-store

#### [SQLite Store](https://npmjs.org/package/seneca-sqlite-store)
[![version][sqlite-store-npm-version]][sqlite-store-npm-url]
[![downloads][sqlite-store-npm-downloads]][sqlite-store-npm-url]
[sqlite-store-npm-version]: https://img.shields.io/npm/v/seneca-sqlite-store.svg?style=flat-square
[sqlite-store-npm-downloads]: https://img.shields.io/npm/dm/seneca-sqlite-store.svg?style=flat-square
[sqlite-store-npm-url]: https://npmjs.org/package/seneca-sqlite-store

#### [Riak Store](https://npmjs.org/package/seneca-riak-store)
[![version][riak-store-npm-version]][riak-store-npm-url]
[![downloads][riak-store-npm-downloads]][riak-store-npm-url]
[riak-store-npm-version]: https://img.shields.io/npm/v/seneca-riak-store.svg?style=flat-square
[riak-store-npm-downloads]: https://img.shields.io/npm/dm/seneca-riak-store.svg?style=flat-square
[riak-store-npm-url]: https://npmjs.org/package/seneca-riak-store

#### [Cassandra Store](https://npmjs.org/package/seneca-cassandra-store)
[![version][cassandra-store-npm-version]][cassandra-store-npm-url]
[![downloads][cassandra-store-npm-downloads]][cassandra-store-npm-url]
[cassandra-store-npm-version]: https://img.shields.io/npm/v/seneca-cassandra-store.svg?style=flat-square
[cassandra-store-npm-downloads]: https://img.shields.io/npm/dm/seneca-cassandra-store.svg?style=flat-square
[cassandra-store-npm-url]: https://npmjs.org/package/seneca-cassandra-store

#### [CouchDB Store](https://npmjs.org/package/seneca-couchdb-store)
[![version][couchdb-store-npm-version]][couchdb-store-npm-url]
[![downloads][couchdb-store-npm-downloads]][couchdb-store-npm-url]
[couchdb-store-npm-version]: https://img.shields.io/npm/v/seneca-couchdb-store.svg?style=flat-square
[couchdb-store-npm-downloads]: https://img.shields.io/npm/dm/seneca-couchdb-store.svg?style=flat-square
[couchdb-store-npm-url]: https://npmjs.org/package/seneca-couchdb-store

#### [SimpleDB Store](https://npmjs.org/package/seneca-simpledb-store)
[![version][simpledb-store-npm-version]][simpledb-store-npm-url]
[![downloads][simpledb-store-npm-downloads]][simpledb-store-npm-url]
[simpledb-store-npm-version]: https://img.shields.io/npm/v/seneca-simpledb-store.svg?style=flat-square
[simpledb-store-npm-downloads]: https://img.shields.io/npm/dm/seneca-simpledb-store.svg?style=flat-square
[simpledb-store-npm-url]: https://npmjs.org/package/seneca-simpledb-store

## Got a Plugin to share?
Our docs are open source, simply fork the [seneca](https://github.com/rjrodger/seneca) repository, add your plugin to the appropriate section in the [gh-pages](https://github.com/rjrodger/seneca/tree/gh-pages) branch under `/src/pages/plugins.index.md`,
and send us on a PR, that way other people can find your awesome plugin easily.
