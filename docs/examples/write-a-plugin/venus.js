module.exports = function (options) {
  this.add('say:hello', function (msg, reply) {
    reply({ hello: 'world' })
  })
}
