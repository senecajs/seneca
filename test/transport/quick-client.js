require('../..')()
  .client()
  .ready( function () {
    this.act('a:1,x:1', console.log)
  })
