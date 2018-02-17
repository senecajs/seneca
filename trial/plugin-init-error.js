require('..')()
  .use(function plugin0() {
    this.add('init:plugin0', function init0() {
      throw new Error('error0')
    })
  })
