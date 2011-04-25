/* Copyright (c) 2011 Ricebridge */

var common  = require('../lib/common')
var connect = common.connect
var assert  = common.assert

var Seneca = require('../lib/seneca')


Seneca.init(
  {plugins:['echo']},
  function(err,seneca){

    var server = connect.createServer(

      function(req,res,next){
        console.trace()

        res.writeHead(200)
        res.end(req.url+' ECHO')
        console.log('aa')
      }
      
      //seneca.service('echo',{mark:true},function(err,ctxt){
      //  console.log(ctxt.mark)
      //})

    )

    server.listen(3000)
  }
)
