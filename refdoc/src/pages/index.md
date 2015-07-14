---
layout: splash.html
---

__Example: a barebones microservice__
```
var seneca = require('seneca')()

seneca.add({ role:'user', cmd:'login' }, function (args, callback) {
  callback(null, { loggedIn:true })
})

seneca.listen()
```

__Example: a barebones client__
```
var seneca = require('seneca')()
var client = seneca.client()

client.act({ role:'user', cmd:'login' }, function (err, result) {
  console.log(result.loggedIn)
})
```
