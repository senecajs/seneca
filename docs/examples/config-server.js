// INSTRUCTIONS
// See config-client.js

// Load Seneca module (replace '../..' with 'seneca' when using outside this repo)
const Seneca = require('../..')

// Create a new instance of Seneca,
// put it into test mode (printing lots of debugging information),
// and use the https://www.npmjs.com/package/seneca-promisify plugin to
// provide an async/await version of the Seneca methods. 
var seneca = Seneca()
    .test('print')
    .use('promisify')

// Define a message pattern and an async action function. It's usually a good idea
// to list all your messages early in the service file to document your service
// message interface. As conveience , you can define message patterns using a
// non-strict JSON-like shorthand syntax (see https://www.npmjs.com/package/jsonic)
    .message('cmd:config', cmd_config)

// Listen for inbound messages using the default HTTP transport (0.0.0.0:10101) 
    .listen()

// Some internal data for this service - load it from somewhere in the
// real world.
const config = {
  rate: 0.23
}

// Implement the `cmd:config` action. Seneca will match incoming message objects
// that have a `cmd` property equal to 'config' to this function. Note that you
// should provide proper functions to Seneca rather than inlining with `=>`, as
// the Seneca instance is exposed via the `this` variable inside the action.
async function cmd_config(msg) {

  // Listing all the data you expect to find in a message at the start of the action
  // function code is a polite way of helping to document your messages.
  // (You can always set up message validation later using the `seneca-joi` plugin).
  var prop = msg.prop

  var result = {
    value: config[prop]
  }

  return result
}


