require('../..')()
  .add({generate: 'id'},
    function (args, done) {
      done(null,
        {id: '' + Math.random()})
    })
  .listen({type: 'web'})
