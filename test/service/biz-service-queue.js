'use strict'

require('../..')()
  .use('biz')
  .listen({type: 'queue'})
