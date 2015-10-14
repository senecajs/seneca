var seneca =
require('../../..')()
  .use('./foo')
  .client(3000)

var shop = seneca.pin({foo: 1, cmd: '*'})
console.log(shop)

shop.a({ bar: 'B' }, console.log)
