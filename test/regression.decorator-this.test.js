const Code = require('@hapi/code')
const Lab = require('@hapi/lab')
const Util = require('util')

const lab = (exports.lab = Lab.script())
const describe = lab.describe
const expect = Code.expect
const it = lab.it

const Seneca = require('..')


describe('regression test, this-ref in a decorator', () => {
  it('calls the decorator with the correct this-ref', test((fin) => {
    const si = Seneca()
    si.test(fin)


    si.decorate('amI', function (self) {
      return this === self
    })


    si.add('hello:world', function (args, reply) {
      const delegate = this.delegate()
      const result = delegate.amI(delegate)
      expect(result).equal(true)

      reply()
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

