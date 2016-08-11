var http = require('http')

http.get({
  hostname: 'localhost',
  port: 3000,
  path: '/shop/salestax?net=100&country=UK'
}, function (res) {
  res.on('data', function (chunk) {
    console.log(JSON.parse(chunk.toString()))
  })
})
