/* Copyright (c) 2014-2015 Richard Rodger, MIT License */
'use strict'

var Assert = require('assert')
var Lab = require('lab')
var Seneca = require('..')

var lab = exports.lab = Lab.script()
var describe = lab.describe
var it = lab.it
var assert = Assert
var testopts = {log: 'silent'}

// Shortcuts
var arrayify = Function.prototype.apply.bind(Array.prototype.slice)

describe('seneca-error', function () {
  it('act_not_found', act_not_found)

  it('param_caller', param_caller)

  it('exec_action_result', exec_action_result)
  it('exec_action_result_nolog', exec_action_result_nolog)

  function act_not_found (done) {
    var ctxt = {errlog: null}
    var si = make_seneca(ctxt)

    si.ready(function () {
      // ~~ CASE: fire-and-forget; err-logged
      si.act('a:1')
      // FIX: validate using act events
      // assert.equal('act_not_found', ctxt.errlog[8])

      // ~~ CASE: callback; default
      ctxt.errlog = null
      si.act('a:1,default$:{x:1}', function (err, out) {
        assert.equal(err, null)
        assert.equal(ctxt.errlog, null)
        assert.ok(out.x)
      })

      // ~~ CASE: callback; default Array
      ctxt.errlog = null
      si.act('a:1,default$:[1,"foo"]', function (err, out) {
        assert.ok(err === null)
        assert.ok(ctxt.errlog === null)
        assert.equal(out[0], 1)
        assert.ok(out[1], 'foo')
      })

      // ~~ CASE: callback; no-default; err-result; err-logged
      si.act('a:1', function (err, out) {
        assert.equal(out, null)
        assert.equal('act_not_found', err.code)
        // assert.equal('act_not_found', ctxt.errlog[8])

        // ~~ CASE: callback; bad-default; err-result; err-logged
        si.act('a:1,default$:"foo"', function (err, out) {
          assert.equal(out, null)
          assert.equal('act_default_bad', err.code)
          // assert.equal('act_default_bad', ctxt.errlog[8])

          // ~~ CASE: fragile; throws; err-logged
          si.options({debug: {fragile: true}})
          ctxt.errlog = null

          si.act('a:1', function (ex) {
            assert.equal('act_not_found', ex.code)
            // assert.equal('act_not_found', ctxt.errlog[8])
            return done()
          })
        })
      })
    })
  }

  function param_caller (done) {
    var ctxt = {errlog: null}
    var si = make_seneca(ctxt)

    si.ready(function () {
      si.add('a:1,b:{required$:true}', function (args, done) { this.good({x: 1}) })

      // ~~ CASE: callback; args-invalid; err-result; err-logged
      si.act('a:1', function (err) {
        assert.equal('act_invalid_args', err.code)
        assert.equal('act_invalid_args', ctxt.errlog[14])

        // ~~ CASE: callback; args-valid
        si.act('a:1,b:1', function (err, out) {
          assert.equal(err, null)
          assert.equal(1, out.x)
          done()
        })
      })
    })
  }

  function exec_action_result (done) {
    var ctxt = {errlog: null, done: done, log: true, name: 'result'}
    var si = make_seneca(ctxt)

    si.add('a:1', function (args, done) {
      done(new Error('BBB'))
    })

    test_action(si, ctxt)
  }

  function exec_action_result_nolog (done) {
    var ctxt = {errlog: null, done: done, log: false, name: 'result_nolog'}
    var si = make_seneca(ctxt)

    si.add('a:1', function (args, done) {
      var err = new Error('CCC')
      err.log = false
      done(err)
    })

    test_action(si, ctxt)
  }

  function make_seneca (ctxt) {
    var si = Seneca(testopts)
    si.options({
      log: {map: [{level: 'error+', handler: function () {
        ctxt.errlog = arrayify(arguments)
      }}]},
      trace: { unknown: 'error' }
    })
    return si
  }

  function test_action (si, ctxt) {
    // ~~ CASE: action; callback; no-errhandler
    si.act('a:1', function (err, out) {
      // Need to use try-catch here as we've subverted the log
      // to test logging.
      try {
        assert.equal(out, null)
        assert.equal('act_execute', err.code, ctxt.name + '-A')
        assert.equal('a:1', err.details.pattern, ctxt.name + '-B')

        if (ctxt.log) {
          assert.equal('act_execute', ctxt.errlog[14], ctxt.name + '-C')
        }
        else {
          assert.equal(ctxt.errlog, null)
        }

        ctxt.errlog = null

        // ~~ CASE: action; no-callback; no-errhandler
        si.on('act-err', function (args, err) {
          try {
            assert.equal(1, args.a)
            assert.equal('act_execute', err.code, ctxt.name + '-D')
            assert.equal('a:1', err.details.pattern, ctxt.name + '-E')

            if (ctxt.log) {
              assert.equal('act_execute', ctxt.errlog[14], ctxt.name + '-F')
            }

            ctxt.done()
          }
          catch (e) {
            ctxt.done(e)
          }
        })
        si.act('a:1')
      }
      catch (e) {
        ctxt.done(e)
      }
    })
  }
})
