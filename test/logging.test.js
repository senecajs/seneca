'use strict'

var Code = require('code')
var Lab = require('lab')
var Logging = require('../lib/legacy-logging')

// Test shortcuts
var lab = exports.lab = Lab.script()
var describe = lab.describe
var it = lab.it
var expect = Code.expect


var internals = {
  format: function (router) {
    return router.toString(true).replace(/\s+/g, '')
  }
}

describe('logging', function () {
  describe('makelogrouter()', function () {
    function A () {}
    A.toString = function () { return 'A' }
    function B () {}
    B.toString = function () { return 'B' }
    function C () {}
    C.toString = function () { return 'C' }

    it('happy', function (done) {
      var router = Logging.makelogrouter({map: [
          { level: 'info', type: 'init', handler: A },
          { level: 'info', type: 'plugin', plugin: 'red', handler: B }
      ]})

      expect(internals.format(router)).to.equal('level:info->plugin:red->type:plugin-><B>|type:init-><A>')
      done()
    })

    it('handles null logspec', function (done) {
      var fn = function () {
        Logging.makelogrouter(null)
      }

      expect(fn).to.not.throw()
      done()
    })

    it('handles logspec thats an empty array', function (done) {
      var fn = function () {
        Logging.makelogrouter([])
      }

      expect(fn).to.not.throw()
      done()
    })

    it('handles logspec thats an empty object', function (done) {
      var fn = function () {
        Logging.makelogrouter({})
      }

      expect(fn).to.not.throw()
      done()
    })

    it('short as an array', function (done) {
      var router = Logging.makelogrouter(['level:info,type:plugin'])
      expect(internals.format(router)).to.equal('level:info->type:plugin-><print>')

      done()
    })

    it('short as an object', function (done) {
      var router = Logging.makelogrouter({ level: 'info', type: 'plugin' })
      expect(internals.format(router)).to.equal('level:info->type:plugin-><print>')

      done()
    })

    it('short', function (done) {
      var router = Logging.makelogrouter('level:info,type:plugin')
      expect(internals.format(router)).to.equal('level:info->type:plugin-><print>')

      router = Logging.makelogrouter(['level:info,type:plugin', 'level:debug,type:act'])
      expect(internals.format(router)).to.equal('level:debug->type:act-><print>info->type:plugin-><print>')
      done()
    })

    it('multiplex', function (done) {
      var router = Logging.makelogrouter({map: [
          {level: 'info', type: 'init', handler: A},
          {level: 'info', type: 'init', handler: B},
          {level: 'info', type: 'init', handler: C}
      ]})

      // fix printing for test
      router.add({level: 'info', type: 'init'}, router.find({level: 'info', type: 'init'}).multiplex)
      expect(internals.format(router)).to.equal('level:info->type:init-><A,B,C>')
      done()
    })

    it('multival.comma', function (done) {
      var router = Logging.makelogrouter({map: [
          {level: 'info', type: 'init,  status', handler: A}
      ]})

      expect(internals.format(router)).to.equal('level:info->type:init-><A>status-><A>')
      done()
    })

    it('multival.space', function (done) {
      var router = Logging.makelogrouter({map: [
          {level: 'info', type: 'init status', handler: A}
      ]})

      expect(internals.format(router)).to.equal('level:info->type:init-><A>status-><A>')
      done()
    })

    it('multimultival', function (done) {
      var router = Logging.makelogrouter({map: [
          {level: 'info,debug', type: 'init,status', handler: A}
      ]})

      expect(internals.format(router)).to.equal('level:debug->type:init-><A>status-><A>info->type:init-><A>status-><A>')
      done()
    })

    it('level.all', function (done) {
      var router = Logging.makelogrouter({map: [
          {level: 'all', type: 'init', handler: A}
      ]})

      expect(internals.format(router)).to.equal('level:debug->type:init-><A>error->type:init-><A>fatal->type:init-><A>info->type:init-><A>warn->type:init-><A>')
      done()
    })

    it('level.upwards', function (done) {
      var router = Logging.makelogrouter({map: [
          {level: 'warn+', type: 'init', handler: A}
      ]})

      expect(internals.format(router)).to.equal('level:error->type:init-><A>fatal->type:init-><A>warn->type:init-><A>')
      done()
    })

    it('level.bad', function (done) {
      try {
        Logging.makelogrouter({ map: [ {level: 'bad', type: 'init', handler: A} ] })
      }
      catch (e) {
        expect(e.code).to.equal('invalid_log_level')
        done()
      }
    })
  })

  describe('makelogroute()', function () {
    it('works without a level or entry', function (done) {
      var router = {
        findexact: function () {},
        remove: function () {},
        add: function () {}
      }
      var fn = function () {
        Logging.makelogroute({}, router)
      }
      expect(fn).to.not.throw()
      done()
    })

    it('supports a tag on the entry', function (done) {
      var router = {
        findexact: function () {
          var prev = {
            tag: 'test'
          }
          return prev
        },
        remove: function () {},
        add: function (route, handler) {
          handler()
        }
      }
      var entry = {
        tag: 'test',
        handler: function () {}
      }

      var fn = function () {
        Logging.makelogroute(entry, router)
      }
      expect(fn).to.not.throw()
      done()
    })
  })

  describe('log_act_cache()', function () {
    it('logs debug information', function (done) {
      var instance = {
        log: {
          debug: function () {
            expect(Object.keys(arguments).length).to.equal(8)
            done()
          }
        }
      }
      var actinfo = {
        actid: 'id'
      }
      var actmeta = {
        pattern: 'pattern',
        descdata: function () {}
      }
      var prior_ctxt = {
        chain: [],
        depth: 0,
        entry: 'test'
      }

      Logging.log_act_cache(instance, actinfo, actmeta, {}, prior_ctxt, {})
    })
  })
})
