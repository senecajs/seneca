var Seneca = require('../../../')


Seneca({tag: 'listen'})
  // .test('print')

  .add({cmd: 'convert'}, convert_action)

  .listen({pin: {cmd: 'convert'}, port: 9090})

  .ready(function () {
    console.log('seneca instance '+this.id)
  })


var colors = {
  red: 'FF0000',
  green: '00FF00',
  blue: '0000FF',
}

function convert_action (msg, reply) {
  var hex = colors[msg.color]

  if (null == hex) {
    hex = '000000'
  }

  console.log('convert '+msg.color+' to '+hex)
  
  reply({hex: hex})
}
