/* Copyright © 2010-2022 Richard Rodger and other contributors, MIT License. */
'use strict'


// Node API modules.
// const Events = require('events')
const Util = require('util')


import type { Instance, MakeSeneca } from './seneca'

import { makeSeneca } from './seneca'


// Seneca is an EventEmitter.
function makeNodeSeneca(seneca_options?: any, more_options?: any): Instance {
  const instance: any = makeSeneca(seneca_options, more_options)

  instance[Util.inspect.custom] = instance.toJSON

  // FIX: does not work? events for browser?
  // Events.EventEmitter.call(instance)
  // instance.setMaxListeners && instance.setMaxListeners(0)

  instance.private$.Util = Util

  return instance
}

Object.assign(makeNodeSeneca, makeSeneca)

const Seneca = makeNodeSeneca as MakeSeneca



export type {
  Instance,
}

export {
  Seneca,
}


if ('undefined' != typeof (module)) {
  module.exports = exports.Seneca
}
