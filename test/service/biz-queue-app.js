require('../..')()
  .use('transport')
  .use('biz')
  .act('role:transport,cmd:client', {pin: {s: 'a'}, type: 'queue'})
  .act('role:transport,cmd:client', {pin: {s: 'b'}, type: 'queue'})
  .ready(function () {
    this
      .act('s:a,d:1')
      .act('s:b,d:2')
      .act('s:c,d:3')
  })
