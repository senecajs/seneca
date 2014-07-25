

var seneca = require('../../..')()

seneca.use( {name:'./bar.js',tag:'AAA'}, {zed:1,color:'red'} )
seneca.use( './bar.js$BBB',              {zed:2,color:'green'} )

seneca.act( {foo:'bar',zed:1}, console.log )
seneca.act( {foo:'bar',zed:2}, console.log )
