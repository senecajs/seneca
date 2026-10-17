// Consumer with module commonjs and esModuleInterop.
import Seneca from 'seneca'

declare module 'seneca' {
  interface Instance {
    make_widget(): number
  }
}

const seneca = Seneca({ log: 'silent' })
seneca.add('a:1', function (msg, reply) {
  reply({ ok: true })
})

// Augmented above; visible after chaining too.
const widget: number = seneca.add('b:1').make_widget()
void widget

// @ts-expect-error: not a Seneca method
seneca.nope()

// @ts-expect-error: augmented only in the ES module program (augment.d.mts)
seneca.make_thing('x')
