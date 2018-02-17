require('..')()
  .use(function plugin0() {
    throw new Error('error0')
  },{foo:1})
