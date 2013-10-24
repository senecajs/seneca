require('../..')()
  .use('transport')
  .use('biz')
  .act('role:transport,cmd:client',{pin:{s:'a'},port:8100})
  .act('role:transport,cmd:client',{pin:{s:'b'},port:8101})
  .ready(function(){
    this
      .act('s:a,d:1')
      .act('s:b,d:2')
      .act('s:c,d:3')
  })

