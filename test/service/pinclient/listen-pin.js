var seneca = require('../../..')()
      .use('./foo')
      .listen(3000)
      .act('foo:1,cmd:a,bar:B',console.log)
