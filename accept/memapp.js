/* Copyright (c) 2010 Ricebridge */

var sys = require('sys');
var connect = require('connect');

var seneca = require('../lib/seneca');
var entity = require('../lib/entity');


var Seneca = seneca.Seneca;
var Entity = entity.Entity;

var entity = Entity.$init('mem:');
var seneca = Seneca.init(entity);


var ent1 = entity.$make({$base:'foo',$name:'bar',p1:'v1'});
ent1.p2 = 100;

ent1.$save( function(err,ent1) {
  sys.puts(ent1);

  var server = connect.createServer(
    connect.router(seneca.router)
  );

  server.listen(3000);
  console.log('Connect server listening on port 3000');

});