'use strict'

require('../..')()
  .use('echo', {inject: {bar: 2}})
  .listen()

  // curl "http://localhost:10101/act?role=echo&foo=1"
  // OR
  // node echo-client.js
