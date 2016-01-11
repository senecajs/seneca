/* Copyright (c) 2010-2014 Richard Rodger, MIT License */
'use strict'

var Connect = require('connect')
var Seneca = require('../..')

var si = Seneca()
si.use('echo')

Connect()
  .use(Connect.logger())
  .use(Connect.json())
  .use(si.export('web'))
  .listen(3000)

  // curl -H "Content-Type:application/json" -d '{"a":1}' http://localhost:3000/echo
