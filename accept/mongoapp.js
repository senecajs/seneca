/* Copyright (c) 2010 Ricebridge */

var sys = require('sys');
var connect = require('connect');

var seneca = require('../lib/seneca');
var entity = require('../lib/entity');
require('../lib/entity-mongo');

var Seneca = seneca.Seneca;
var Entity = entity.Entity;

Entity.$init('mongo://localhost/entity_mongo_test',function(entity){
  var seneca = Seneca.init(entity);


  var ent1 = entity.$make({$tenant:'test',$base:'foo',$name:'bar',p1:'v1'});
  ent1.p2 = 100;

  ent1.$save( function(err,ent1) {
    sys.puts(ent1);
    sys.puts('http://localhost:3000/seneca/1.0/entity/test/foo/bar/id/'+ent1.id);

    var server = connect.createServer(
      connect.router(seneca.router)
    );

    server.listen(3000);
  });
});