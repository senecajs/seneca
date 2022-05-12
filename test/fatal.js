const Seneca = require('..')

function pe1() {
  throw new Error('AA')
}

const seneca = Seneca({
  legacy: false,
  log: { level: 'debug', logger: 'flat' },
  death_delay: 1,
})
  // .use(pe1)

  .add('a:1', function () {
    throw new Error('A1')
  })
  .listen()
  .ready(function () {
    this.act('a:1', { fatal$: true }, Seneca.util.print)
  })
