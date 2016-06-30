'use strict'

require('..')({
  // legacy:{logger:false},
  // log:{basic:{level:'debug',kind:'client'}}
})
  // .client(9001)
  .add('a:1', function (m, d) { d(null, {x: 1}) })
  .act('a:1', console.log)
