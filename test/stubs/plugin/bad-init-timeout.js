'use strict'

require('../../..')({timeout: 555})
  .use(function init_timeout () {
    this.add('init:init_timeout', function () {})
  })
