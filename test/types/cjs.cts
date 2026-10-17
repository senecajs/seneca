// CommonJS consumer under module nodenext.
import Seneca = require('seneca')

const seneca: Seneca.Instance = Seneca().test()
seneca.add('a:1', function (msg, reply) {
  reply({ ok: true })
})
