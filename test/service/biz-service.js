require('../..')()
  .use('biz')
  .listen(parseInt(process.argv[2], 10))
