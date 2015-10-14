require('../..')()
  .use('biz')
  .listen({type: 'queue'})
