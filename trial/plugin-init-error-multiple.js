require('..')()
  .use(function plugin0() {
    this.add('init:plugin0', function init0() {
      throw new Error('error0')
    })
  })
  .use(function plugin1() {
    this.add('init:plugin1', function init1() {
      throw new Error('error1')
    })
  })
  .use(function plugin2() {
    this.add('init:plugin2', function init2() {
      throw new Error('error2')
    })
  })
