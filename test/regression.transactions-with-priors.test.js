const Code = require('@hapi/code')
const Lab = require('@hapi/lab')
const Util = require('util')

const lab = (exports.lab = Lab.script())
const describe = lab.describe
const expect = Code.expect
const it = lab.it

const Seneca = require('..')


describe('regression test, prior stack on a db trx instance', () => {
  function mockTrxImplementation() {
    this.add('sys:entity,transaction:transaction', (args, reply) => {
      const get_handle = () => null
      reply(null, { get_handle })
    })
  }

  it('db trx instance does not lose the prior stack', test((fin) => {
    const si = Seneca()

    si.use('entity', {
      transaction: { active: true }
    })

    si.use(mockTrxImplementation)

    si.test(fin)


    si.add('hello:world', function (args, reply) {
      reply()
    })


    si.add('hello:world', function (args, reply) {
      this.entity.transaction()
      	.then(senecatrx => {
	  senecatrx.prior(args, reply)
	})
	.catch(reply)
    })


    si.ready(() => {
      si.act('hello:world', fin)
    })
  }))
})


function test(t) {
  return () => new Promise((resolve, reject) => {
    Util.promisify(t)()
      .then(resolve)
      .catch(reject)
  })
}


