const Seneca = require('..')


const si = Seneca()


si.decorate('lorem', function (self) {
  console.log(this === self)
})


si.add('hello:world', function (args, reply) {
  const delegate = this.delegate()
  delegate.lorem(delegate)

  reply()
})


si.ready(() => {
  si.act('hello:world', () => {})
})

