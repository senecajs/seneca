
var seneca = require('../..')()

seneca.use('transport',{
  remoteurl:'http://localhost:3000/transport',
  pins:[ {cmd:'salestax'} ]
})

seneca.act( {cmd:'salestax', country:'IE', net:100})
seneca.act( {cmd:'salestax', country:'UK', net:200})
seneca.act( {cmd:'salestax', country:'UK', net:300})


