const Seneca = require('..')

const si = Seneca().test('print')

si.ready(console.log)
