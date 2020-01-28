// INSTRUCTIONS
// 1. Run the server:
//   $ node config-server.js
//   ... lots of debug log entries...,
//   and then IN and OUT debug log entries for the call to cmd:config
// 2. Run the client:
//   $ node config-client.js
//   ... prints result ...
// 3. View the logs output by config-server.js to see the message handling activity.
//
// The config-server will staying running until shut down.
// The config-client will halt after obtaining a response.


// Load Seneca module (replace '../..' with 'seneca' when using outside this repo)
const Seneca = require('../..')

// Create a new instance of Seneca,
// put it into test mode (but only print errors),
// and use the https://www.npmjs.com/package/seneca-promisify plugin to
// provide an async/await version of the Seneca methods. 
var seneca = Seneca()
    .test()
    .use('promisify')

// Send outbound messages using the default HTTP transport (0.0.0.0:10101) 
    .client()

// Get rate from config-server.
get_rate()

// This example function is `async` so we can use `await` inside it.
async function get_rate() {
  console.log('SENDING cmd:config,prop:rate...')
  var result = await seneca.post({cmd:'config',prop:'rate'})
  
  console.log('RESULT:', result)
}


