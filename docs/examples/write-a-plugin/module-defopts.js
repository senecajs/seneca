

var seneca = require('../../..')()

seneca.use( './foo-defopts.js', {
  color:'pink',
  box:{
    width:50
  }
})

seneca.act( {foo:'bar'}, console.log )
