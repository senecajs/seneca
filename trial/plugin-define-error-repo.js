require('..')()
  .use(
    {
      name: 'plugin0',
      init: function plugin0() {
        throw new Error('error0')
      },
      repo: 'http://github.com/senecajs/plugin0'
    },
    {foo:1})
