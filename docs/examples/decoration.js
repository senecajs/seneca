'use strict'

// Decorations are a good way to mix in commonly used
// functionality with your seneca instance. See Below
// for an example of adding a simple decorations.

var Seneca = require('../..')
var Assert = require('assert')

// Plugins are great way to add decorations to seneca. Below we have
// a simple plugin that adds the .stamp() method to our instance. This
// will allow us to log objects with a timestamp. Simple stuff.

function plugin (opts) {
  var seneca = this

  seneca.decorate('stamp', (pattern) => {
    Assert((pattern === 'role:echo'))
    console.log(Date.now().toString(), pattern)
  })

  return {
    name: 'timestamper'
  }
}

// We load our plugin like any other. Once ready has fired your decoration
// becomes available to use on any instance of seneca that loads the plugin.

var instance = Seneca()
  .use(plugin)
  .ready((err) => {
    Assert(!err)

    instance.stamp('role:echo')
  })

// Prints
// <timestamp> role:echo
