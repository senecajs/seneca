// Actions whose message and result types are declared, as TypeScript
// plugins write them. Seneca checks patterns and rules at runtime, not at
// compile time, so the declared message type is trusted, as with post<T>.

import Seneca from 'seneca'
import type { Instance, Meta, Reply } from 'seneca'

type PriceMsg = { item: string; qty: number }
type PriceOut = { ok: true; total: number } | { ok: false; why: string }
interface CartMsg {
  cart: string[]
}

async function price(this: Instance, msg: PriceMsg): Promise<PriceOut> {
  return msg.qty < 0 ? { ok: false, why: 'qty' } : { ok: true, total: msg.qty * 2 }
}

async function cart(this: Instance, msg: CartMsg, meta: Meta): Promise<{ n: number; id: string }> {
  return { n: msg.cart.length, id: meta.id }
}

function add_price(this: Instance, msg: PriceMsg, reply: Reply): void {
  reply({ total: msg.qty })
}

const seneca: Instance = Seneca()

seneca
  .message('role:shop,cmd:price', price)
  .message('role:shop,cmd:cart', { cart: Array }, cart)
  .message<PriceMsg>('role:shop,cmd:inline', async function (msg) {
    const qty: number = msg.qty
    return { qty }
  })
  .add('role:shop,cmd:add', add_price)
  .add('role:shop,cmd:add2', { item: String }, add_price)

// An unannotated action keeps the default message type, Seneca.Msg.
seneca.message('a:1', async function (msg) {
  const name: string = msg.name
  return { name }
})

// @ts-expect-error: a message is an object
seneca.message('a:2', async function (msg: string) {
  return { msg }
})

// @ts-expect-error: an action resolves to an object, an array or null
seneca.message('a:3', async function (msg: PriceMsg) {
  return msg.qty
})

// @ts-expect-error: the action's message type must accept the declared one
seneca.message<PriceMsg>('a:4', async function (msg: CartMsg) {
  return msg
})
