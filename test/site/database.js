'use strict'

var Seneca = require('../..')
var seneca = Seneca()

function saveload (seneca) {
  var product = seneca.make('product')
  product.name = 'apple'
  product.price = 100

  product.save$(function (err, product) {
    if (err) return console.error(err)
    console.log('saved: ' + product)

    // product.id was generated for us
    product.load$({id: product.id}, function (err, product) {
      if (err) return console.error(err)
      console.log('loaded: ' + product)
    })
  })
}

saveload(seneca)

seneca.ready(function (err, seneca) {
  if (err) return console.error('ERROR:' + err)

  // saveload(seneca)

  var product = seneca.make('product')
  product.name = 'apple'
  product.price = 100

  seneca.act({role: 'entity', cmd: 'save', ent: product},
    function (err, product) {
      if (err) return console.error(err)
      console.log('saved: ' + product)

      seneca.act({role: 'entity', cmd: 'load', q: {id: product.id}, qent: product},
        function (err, product) {
          if (err) return console.error(err)
          console.log('loaded: ' + product)
        })
    })
})
