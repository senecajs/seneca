'use strict'

require('../..')()
  .use('biz')
  .client({type: 'queue'})
  .ready(function () {
    this
      .act('s:a,d:1')
      .act('s:b,d:2')
      .act('s:c,d:3')
  })
