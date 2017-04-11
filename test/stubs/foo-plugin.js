module.exports = function foo () {
  this.add('b:2', function b2 (msg, reply) {
    reply({y: 1})
  })
}
