module.exports = function mercury(options) {
  this.add('say:hello', function (msg, reply) {
    reply({ hello: 'world' })
  })
}
