'use strict'

var Seneca = require('../..')
var Tmp = require('./tmp')


Seneca({ log: 'silent' })
  .use(Tmp)
  .listen({ type: 'tcp', port: '30010', pin: 'role:tmp' })
