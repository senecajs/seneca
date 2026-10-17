// Compile-only checks of the public types for an ES module consumer
// (module nodenext). Run by npm run test-types.

import Seneca from 'seneca'
import type { Instance, Options } from 'seneca'

const options: Options = { tag: 'types', timeout: 2222 }
const seneca: Instance = Seneca(options)

seneca
  .add('a:1', function (msg, reply, meta) {
    const id: string = meta.id
    const that: Seneca.Instance = this
    reply({ x: msg.x, id, did: that.did })
  })
  .add({ b: 1 }, { c: 2 }, function (msg, reply) {
    reply(null, [1, 2])
  })
  .message('c:1', async function (msg, meta) {
    return { y: msg.y, pattern: meta.pattern }
  })
  .act('a:1', { x: 1 }, function (err, out, meta) {
    if (err) throw err
    void out
    void meta
  })

async function run(): Promise<void> {
  await seneca.ready()
  const out = await seneca.post<{ y: number }>('c:1', { y: 2 })
  const y: number = out.y
  void y

  const actdef = seneca.find('a:1')
  const pattern: string | undefined = actdef?.pattern
  void pattern

  const opts = seneca.options()
  const timeout: number | undefined = opts.timeout
  void timeout

  const chained: Seneca.Instance = seneca.options({ timeout: 3333 }, true)
  void chained

  const closed: boolean = seneca.flags.closed
  void closed

  const shape = seneca.valid({ a: Number })
  void shape

  await seneca.close()
}
void run

// @ts-expect-error: not a Seneca method
seneca.nope()

// @ts-expect-error: timeout is a number
Seneca({ timeout: 'soon' })

// @ts-expect-error: post resolves to a value, it is not chainable
seneca.post('a:1').add('b:1')

// @ts-expect-error: decorate returns undefined
seneca.decorate('foo', 1).add('b:1')

// Augmented in augment.d.mts.
const thing: { kind: string } = seneca.make_thing('x')
void thing

seneca.add('d:1', function (msg, reply) {
  // Augmented members are visible inside actions too.
  reply(this.make_thing(msg.name))
})
