require('../..')({log:'silent',debug:{short_logs:true}})
  .use('biz')

  .start()
  
  .act('s:a,d:1')
  .act('s:b,d:2')
  .act('s:c,d:3')

  .end()
