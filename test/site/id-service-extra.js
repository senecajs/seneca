var Id = require('./id-module')

require('../..')()
  .add({generate: 'id'}, Id.random)
  .add({generate: 'id', type: 'nid'}, Id.nid)
  .listen()
