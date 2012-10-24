/* Copyright (c) 2010-2012 Ricebridge */

var connect = require('connect')
var seneca  = require('../../lib/seneca.js')

var si = seneca({log:'print',plugins:['echo']})

var app = connect()
  .use(connect.logger())
  .use(connect.json())
  .use( si.service() )
  .listen(3000);


// curl -H "Content-Type:application/json" -d '{"a":1}' http://localhost:3000/echo
