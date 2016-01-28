'use strict'

var Seneca = require('../..')
var seneca = Seneca()

seneca.die(new Error('eek!'))
