
var seneca = require('../../../lib/seneca.js')()

var foo = {
  bar: 1,
  colors: {
    red:   50,
    green: 100,
    blue:  150,
  }
}

var bar = seneca.util.deepextend(foo,{
  bar: 2,
  colors: {
    red: 200
  }
})

console.log(bar)
