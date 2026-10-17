/* Copyright © 2026 Richard Rodger and other contributors, MIT License. */

// Deprecation warnings for the Seneca 3 names and behaviours that Seneca 4
// still supports, and that Seneca 5 removes.
//
// Each deprecation code is reported once per process, on two channels:
//
// * a warn-level Seneca log entry: { kind: 'notice', case: 'DEPRECATED',
//   code, notice }, on the instance that used the deprecated name (or the
//   most recently created instance, for static utilities);
// * a Node.js DeprecationWarning with the code SENECA_DEP_<CODE>, so that
//   node --no-deprecation, --trace-deprecation and --throw-deprecation
//   apply.
//
// The option debug.deprecation: false turns both off.

import Errors from './errors'

type Instance = {
  log?: { warn: (entry: Record<string, unknown>) => void }
  options?: () => { debug?: { deprecation?: boolean } }
}

const messages: Record<string, string> = Errors.deprecation

const reported = new Set<string>()

// Fallback for deprecations reached without an instance (Seneca.util).
let current: Instance | null = null

function track(instance: Instance): void {
  current = instance
}

function render(template: string, values: Record<string, unknown>): string {
  return template.replace(/<%=\s*(\w+)\s*%>/g, (_m, key: string) =>
    String(values[key] ?? ''),
  )
}

// Report the deprecation `code` once. `key` distinguishes reports of the
// same code for different subjects (for example, per plugin).
function deprecate(
  instance: Instance | null | undefined,
  code: string,
  values: Record<string, unknown> = {},
  key: string = code,
): void {
  if (reported.has(key)) return

  const target = instance ?? current
  let active = true
  try {
    active = false !== target?.options?.().debug?.deprecation
  } catch (_e) {
    // Options are not available during construction; report anyway.
  }
  if (!active) return

  reported.add(key)

  const template = messages[code]
  const notice = null == template ? code : render(template, values)
  const nodeCode = 'SENECA_DEP_' + code.toUpperCase()

  target?.log?.warn({
    kind: 'notice',
    case: 'DEPRECATED',
    code: nodeCode,
    notice,
  })

  process.emitWarning(notice, { type: 'DeprecationWarning', code: nodeCode })
}

// A function that reports `code` and then calls `fn` with the same `this`.
function deprecated<F extends (this: any, ...args: any[]) => any>(
  code: string,
  fn: F,
): F {
  const wrapper = function (this: any, ...args: any[]) {
    deprecate(this && this.isSeneca ? this : null, code)
    return fn.apply(this, args)
  }
  Object.defineProperty(wrapper, 'name', { value: fn.name })
  return wrapper as F
}

// For tests only: forget which codes were reported.
function reset(): void {
  reported.clear()
}

const Deprecate = {
  deprecate,
  deprecated,
  track,
  reset,
}

export { Deprecate }
