/* Copyright (c) 2014 Richard Rodger, MIT License */
'use strict'

var Assert = require('assert')
var Lab = require('lab')
var Common = require('../lib/common')

var lab = exports.lab = Lab.script()
var describe = lab.describe
var it = lab.it
var assert = Assert

describe('common', function () {
  it('deepextend-empty', function (done) {
    assert.equal(null, Common.deepextend({}).a)

    assert.equal(1, Common.deepextend({a: 1}).a)

    assert.equal(1, Common.deepextend({}, {a: 1}).a)
    assert.equal(1, Common.deepextend({a: 1}, {}).a)

    assert.equal(1, Common.deepextend({}, {a: 1}, {b: 2}).a)
    assert.equal(2, Common.deepextend({}, {a: 1}, {b: 2}).b)

    assert.equal(1, Common.deepextend({a: 1}, {b: 2}, {}).a)
    assert.equal(2, Common.deepextend({a: 1}, {b: 2}, {}).b)

    assert.equal(1, Common.deepextend({}, {a: 1}, {b: 2}, {}).a)
    assert.equal(2, Common.deepextend({}, {a: 1}, {b: 2}, {}).b)

    assert.equal(1, Common.deepextend({}, {a: 1}, {}, {b: 2}, {}).a)
    assert.equal(2, Common.deepextend({}, {a: 1}, {}, {b: 2}, {}).b)

    assert.equal(1, Common.deepextend({a: {b: 1}}, {}).a.b)
    assert.equal(1, Common.deepextend({}, {a: {b: 1}}).a.b)

    assert.equal(1, Common.deepextend({a: {b: 1}}, {c: {d: 2}}, {}).a.b)
    assert.equal(2, Common.deepextend({a: {b: 1}}, {c: {d: 2}}, {}).c.d)

    assert.equal(1, Common.deepextend({}, {a: {b: 1}}, {c: {d: 2}}).a.b)
    assert.equal(2, Common.deepextend({}, {a: {b: 1}}, {c: {d: 2}}).c.d)

    assert.equal(1, Common.deepextend({}, {a: {b: 1}}, {c: {d: 2}}, {}).a.b)
    assert.equal(2, Common.deepextend({}, {a: {b: 1}}, {c: {d: 2}}, {}).c.d)

    assert.equal(1, Common.deepextend({}, {a: {b: 1}}, {}, {c: {d: 2}}, {}).a.b)
    assert.equal(2, Common.deepextend({}, {a: {b: 1}}, {}, {c: {d: 2}}, {}).c.d)

    assert.equal(1, Common.deepextend({a: {b: 1}}, {a: {c: 2}}, {}).a.b)
    assert.equal(2, Common.deepextend({a: {b: 1}}, {a: {c: 2}}, {}).a.c)

    assert.equal(1, Common.deepextend({}, {a: {b: 1}}, {a: {c: 2}}).a.b)
    assert.equal(2, Common.deepextend({}, {a: {b: 1}}, {a: {c: 2}}).a.c)

    assert.equal(1, Common.deepextend({}, {a: {b: 1}}, {a: {c: 2}}, {}).a.b)
    assert.equal(2, Common.deepextend({}, {a: {b: 1}}, {a: {c: 2}}, {}).a.c)

    assert.equal(1, Common.deepextend({}, {a: {b: 1}}, {}, {a: {c: 2}}, {}).a.b)
    assert.equal(2, Common.deepextend({}, {a: {b: 1}}, {}, {a: {c: 2}}, {}).a.c)

    assert.equal(1, Common.deepextend({a: {b: 1}}, {a: {b: 1}}, {}).a.b)

    assert.equal(2, Common.deepextend({}, {a: {b: 1}}, {a: {b: 2}}).a.b)

    assert.equal(2, Common.deepextend({}, {a: {b: 1}}, {a: {b: 2}}, {}).a.b)

    assert.equal(2, Common.deepextend({}, {a: {b: 1}}, {}, {a: {b: 2}}, {}).a.b)

    done()
  })

  it('deepextend-dups', function (done) {
    var aa = {a: {aa: 1}}
    var bb = {a: {bb: 2}}

    var out = Common.deepextend(aa, bb, aa)

    assert.equal(1, out.a.aa)
    assert.equal(2, out.a.bb)

    out = Common.deepextend({}, aa, bb, aa)
    assert.equal(1, out.a.aa)
    assert.equal(2, out.a.bb)
    done()
  })

  it('deepextend-objs', function (done) {
    var d = {
      s: 's',
      n: 100,
      d: new Date(),
      f: function () {},
      a: arguments,
      r: /a/,
      b: Buffer('b')
    }
    var o = Common.deepextend({}, d)
    assert.equal('' + o, '' + d)
    done()
  })

  it('pattern', function (done) {
    assert.equal('a:1', Common.pattern({a: 1}))
    assert.equal('a:1,b:2', Common.pattern({a: 1, b: 2}))
    assert.equal('a:1,b:2', Common.pattern({a: 1, b: 2, c$: 3}))
    assert.equal('a:1,b:2', Common.pattern({b: 2, c$: 3, a: 1}))
    done()
  })
})
