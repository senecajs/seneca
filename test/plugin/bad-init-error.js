'use strict'

require('../..')()
  .use(function init_error () {
    this.add('init:init_error', function () {
      throw Error('Some init error details.')
    })
  })
