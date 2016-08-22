'use strict'

var Code = require('code')
var Lab = require('lab')
var Actions = require('../lib/actions')

var lab = exports.lab = Lab.script()
var describe = lab.describe
var it = lab.it
var expect = Code.expect


describe('actions', function () {
  it('returns a list of found actions matching a string pattern', function (done) {
    var seneca = {
      private$: {
        actrouter: {
          list: function () {
            return [
              { match: 'hello' }
            ]
          }
        }
      }
    }

    var found = Actions.list.call(seneca, '{test:true}')
    expect(found.length).to.equal(1)
    expect(found[0]).to.be.equal('hello')
    done()
  })

  it('returns a list of found actions matching an object pattern', function (done) {
    var seneca = {
      private$: {
        actrouter: {
          list: function () {
            return [
              { match: true },
              { match: false }
            ]
          }
        }
      }
    }

    var found = Actions.list.call(seneca, { test: true })
    expect(found.length).to.equal(2)
    expect(found[0]).to.be.true()
    done()
  })
})
