'use strict'

require('..')({
  // legacy:{logger:false},
  // log:{basic:{level:'debug',kind:'client'}}
})
  // .client(9001)
  .use(function foo () {
    this.add('b:2', function b2 (m, d) { d(null, {y: 1}) })
  })
  .add('a:1', function (m, d) { d(null, {x: 1}) })
  .act('a:1', console.log)
  .act('b:2', console.log)

