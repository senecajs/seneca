'use strict'

require('..')()
  .add('a:1', function (m, d) { d(null, {x: 1}) })
  .act('a:1', console.log)
