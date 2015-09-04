var seneca = require('../..')()


seneca.add('role:entity,cmd:save', function( msg, respond ) {
  msg.ent.last_updated = Date.now()
  this.prior( msg, respond )
})

seneca.make$('foo').data$({bar:1}).save$( console.log )


seneca.add('role:entity,cmd:save,name:bar', function( msg, respond ) {
  msg.ent.zed = 1
  this.prior( msg, respond )
})


seneca.make$('foo').data$({a:1}).save$( console.log )
seneca.make$('bar').data$({b:1}).save$( console.log )
