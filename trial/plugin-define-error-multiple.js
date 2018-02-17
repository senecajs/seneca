require('..')()
  .use(function plugin0() {
    throw new Error('error0')
  })
  .use(function plugin1() {
    throw new Error('error1')
  })
  .use(function plugin2() {
    throw new Error('error2')
  })
