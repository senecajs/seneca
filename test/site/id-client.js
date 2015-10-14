require('../..')()
  .client()
  .act({ generate: 'id' },
    function (err, out) {
      console.log(out, err)
    })
