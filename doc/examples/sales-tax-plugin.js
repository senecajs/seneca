
module.exports = function( options ) {
  var seneca = this
  var plugin = 'shop'

  seneca.add( { role:plugin, cmd:'salestax' }, function(args,callback){
    var total = parseFloat(args.net,10) * (1+options.rate)
    seneca.log.debug( args.net, total, options.rate )
    callback(null,{total:total})
  })


  seneca.act({role:'web', use:{
    prefix:'shop/',
    pin:{role:'shop',cmd:'*'},
    map:{
      salestax:{GET:true}
    }
  }})


  return {
    name:plugin
  }
}
