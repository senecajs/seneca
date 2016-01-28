'use strict'

require('../..')()
  .use('transport')
  .use('biz')

  .act('role:transport,cmd:client', {pin: {s: 'a'}, port: 8200})
  .act('role:transport,cmd:client', {pin: {s: 'b'}, port: 8201})
  .act('role:transport,cmd:client', {pin: {s: 'c'}, port: 8202})

  .ready(function () {
    this
      .act('s:a,d:1')
      .act('s:b,d:2')
      .act('s:c,d:3')
  })
