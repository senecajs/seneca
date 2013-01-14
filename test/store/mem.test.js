/* Copyright (c) 2010-2013 Richard Rodger */

var seneca   = require('../..')

var shared   = require('./shared')


var si = seneca()
si.use('mem-store')

si.__testcount = 0
var testcount = 0

module.exports = {
  basictest: (testcount++, shared.basictest(si)),
  closetest: shared.closetest(si,testcount)
}