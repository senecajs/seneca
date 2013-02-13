
module.exports = function( seneca, options, callback ) {

  var salestax = {
    hits:0,
    rate:options.rate,
    country:options.country
  }
  salestax.calc = function(net){
    return net * (1+salestax.rate)
  }

  seneca.add( {cmd:'salestax',country:salestax.country}, function(args,callback){
    var total = salestax.calc(args.net)
    salestax.hits++
    seneca.log.debug(args.actid$,
                     'net:',args.net,
                     'total:',total,
                     'tax:',salestax)
    callback(null,{total:total})
  })

  callback(null,{name:'sales-tax',tag:salestax.country})
}
