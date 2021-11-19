/* Copyright © 2021 Richard Rodger and other contributors, MIT License. */
'use strict'



class Meta {

  start: number = Date.now()
  end?: number

  pattern?: string
  action?: any

  mi: string = ''
  tx: string = ''
  id: string = ''

  instance: string
  tag: string
  seneca: string
  version: string = '0.1.0'

  gate: boolean = false
  fatal: boolean = false
  closing: boolean = false
  sync: boolean = true
  local: boolean = true
  remote: boolean = false

  timeout: number = 0

  dflt: any

  custom: any

  plugin: any
  prior: any
  caller: any
  parents: any

  trace: any
  sub: any
  data: any
  err: any
  err_trace: any
  error: any
  empty: any


  constructor(instance: any, opts: any, origmsg: any, origreply: any) {
    let id_tx = Meta.resolve_msg_id_tx(instance, origmsg)

    let origmeta = origmsg.meta$

    // Only a limited set of meta properties can be fixed
    let fixedmeta = instance.fixedmeta || {}

    this.mi = id_tx[0]
    this.tx = id_tx[1]
    this.id = id_tx[0] + '/' + id_tx[1]

    this.instance = instance.id
    this.tag = instance.tag
    this.seneca = instance.version

    this.gate = !!origmsg.gate$ || fixedmeta.gate
    this.fatal = !!origmsg.fatal$ || fixedmeta.fatal
    this.local = !!origmsg.local$ || fixedmeta.local

    this.closing = !!origmsg.closing$ || (origmeta && origmeta.closing)

    this.timeout = Math.max(
      0,
      'number' === typeof origmsg.timeout$ ? origmsg.timeout$ : opts.timeout
    )

    this.dflt = origmsg.default$ || (origmeta && origmeta.dflt)

    // NOTE: do not create object here if not provided explicitly.
    // The parent custom object will be used when available during inward processing.
    // This preserves object ref of custom object, as it is shared over calls
    this.custom = origmsg.custom$ || (origmeta && origmeta.custom) || null

    this.plugin = origmsg.plugin$
    this.prior = origmsg.prior$
    this.caller = origmsg.caller$
    this.parents = origmsg.parents$

    // Only true for arriving messages. Child messages called from an
    // action triggered by a remote message are not considered remote.
    this.remote = !!origmsg.remote$

    this.sync =
      null != origmsg.sync$
        ? !!origmsg.sync$
        : origmeta && null != origmeta.sync
          ? !!origmeta.sync
          : 'function' === typeof origreply

    this.trace = null
    this.sub = null
    this.data = null
    this.err = null
    this.err_trace = null
    this.error = null
    this.empty = null
  }


  static resolve_msg_id_tx(instance: any, origmsg: any) {
    let id_tx = (origmsg.id$ || origmsg.actid$ || instance.idgen()).split(
      '/'
    )

    id_tx[1] =
      id_tx[1] ||
      origmsg.tx$ ||
      instance.fixedargs.tx$ ||
      instance.idgen()

    id_tx[0] = id_tx[0] || instance.idgen()

    return id_tx
  }

}


export {
  Meta
}
