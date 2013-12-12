var id = require('./id-module');

require('../..')()
  .add( { generate:'id'},             id.random )
  .add( { generate:'id', type:'nid'}, id.nid )
  .listen()
