// How a plugin declares the members it adds to instances.
import 'seneca'

declare module 'seneca' {
  interface Instance {
    make_thing(name: string): { kind: string }
  }
}
