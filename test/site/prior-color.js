var seneca = require('../..')()

seneca.use(function color () {
  var map_name_hex = {
    black: '000000',
    red: 'FF0000',
    green: '00FF00',
    blue: '0000FF',
    white: 'FFFFFF'
  }

  this
    .add('role:color,cmd:convert', function (msg, respond) {
      var out = {hex: map_name_hex[msg.name]}
      respond(null, out)
    })
})

seneca.act('role:color,cmd:convert,name:red', console.log)
seneca.act('role:color,cmd:convert,name:yellow', console.log)

seneca.add('role:color,cmd:convert,name:yellow', function (msg, respond) {
  respond(null, { hex: 'FFFF00' })
})

seneca.act('role:color,cmd:convert,name:yellow', console.log)

var more_name_hex = {
  cyan: '00FFFF',
  fuchsia: 'FF00FF'
}

seneca.add('role:color,cmd:convert', function (msg, respond) {
  this.prior(msg, function (err, out) {
    if (err) return respond(out)

    if (out.hex == null) {
      out.hex = more_name_hex[msg.name]
    }

    respond(null, out)
  })
})

seneca.act('role:color,cmd:convert,name:cyan', console.log)
seneca.act('role:color,cmd:convert,name:yellow', console.log)
seneca.act('role:color,cmd:convert,name:red', console.log)
