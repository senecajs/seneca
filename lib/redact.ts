/* Copyright © 2026 Richard Rodger and other contributors, MIT License. */
'use strict'

// Keep secrets out of the data that leaves a Seneca instance.
//
// The redactor replaces the values of secret-looking keys (and the
// password in a URL with credentials) in log entries, the log event,
// error details, printed options and fatal error reports. It never
// modifies its input: objects on the path to a redacted value are
// copied, everything else is shared.
//
// Error message text does not contain message or option values at all:
// describe_msg describes a message by its pattern keys, and
// describe_shape_errors describes validation failures, without values.

import { EventEmitter } from 'events'

import Jsonic from 'jsonic'

// A key name is split into lowercase words at "-", "_", ".", spaces,
// digits and camelCase boundaries: apiKey, api_key and API-KEY are all
// the words api and key. The key is secret when:

// a word ends with one of these (dbPassword, accesstoken, clientsecret),
const SECRET_SUFFIXES = [
  'password',
  'passwd',
  'passphrase',
  'secret',
  'secrets',
  'token',
  'apikey',
  'privatekey',
  'credential',
  'credentials',
  'authorization',
  'cookie',
  'cookies',
]

// a word is one of these (pass, user_pass),
const SECRET_WORDS = ['pass']

// the last word is one of these (auth, basic_auth, db_pwd),
const SECRET_LAST_WORDS = ['auth', 'pwd']

// or two adjacent words are one of these pairs (api_key, signingKey).
const SECRET_PAIRS = [
  ['api', 'key'],
  ['private', 'key'],
  ['secret', 'key'],
  ['signing', 'key'],
  ['access', 'key'],
  ['encryption', 'key'],
  ['session', 'key'],
]

// So max_tokens, passenger, author and cache_key are not secret.
// The `redact.keys` option adds names: a key is also secret when its
// words contain the words of one of those names, in order.
const SECRET_KEYS = SECRET_SUFFIXES.concat(
  SECRET_WORDS,
  SECRET_LAST_WORDS,
  SECRET_PAIRS.map((pair) => pair.join('_')),
)

const DEFAULT_MARK = '[REDACTED]'

// Objects nested deeper than this are passed through unchanged.
const MAX_DEPTH = 22

// Most other keys named in a message description.
const MAX_OTHER_KEYS = 22

// Longest pattern value shown in a message description.
const MAX_VALUE_LEN = 44

// A URL with credentials: scheme://user:password@host. The password runs
// to the last "@" before the path, query or fragment.
const URL_CREDENTIALS_RE = /([a-z][a-z0-9+.-]*:\/\/[^\s:@/?#]*:)[^\s/?#]*@/gi

const EMPTY_SET: Set<string> = new Set()

type RedactSpec = {
  active?: boolean
  keys?: string[]
  mark?: string
}

type Redactor = {
  (val: any, max_depth?: number): any
  active: boolean
  mark: string
  is_secret_key: (key: string) => boolean
  is_secret_path: (path: string) => boolean
  matches_key: (key: string) => boolean
  argv: (args: any[]) => any[]
}

// Marks an object that is still being walked.
const IN_PROGRESS = Symbol('in_progress')

// The state of one walk: the result for each object walked so far, and
// copies made early for objects reached again through a cycle.
type WalkState = {
  seen: Map<any, any>
  copies: Map<any, any> | null
}

function words(key: string): string[] {
  return key
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
    .replace(/([a-zA-Z])([0-9])/g, '$1 $2')
    .replace(/([0-9])([a-zA-Z])/g, '$1 $2')
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((w: string) => '' !== w)
}

function contains(haystack: string[], needle: string[]): boolean {
  for (let i = 0; i + needle.length <= haystack.length; i++) {
    let found = true
    for (let j = 0; found && j < needle.length; j++) {
      found = haystack[i + j] === needle[j]
    }
    if (found) return true
  }
  return false
}

function make_redactor(spec?: RedactSpec): Redactor {
  spec = spec || {}

  const active = false !== spec.active
  const mark = null == spec.mark ? DEFAULT_MARK : String(spec.mark)
  const extra = (spec.keys || [])
    .map((k: any) => words(String(k)))
    .filter((ws: string[]) => 0 < ws.length)

  const known: Map<string, boolean> = new Map()

  // True if the key name looks secret, whether or not redaction is active.
  function matches_key(key: string): boolean {
    if ('string' !== typeof key) return false

    let secret = known.get(key)
    if (undefined === secret) {
      const ws = words(key)
      const last = ws[ws.length - 1]
      secret =
        ws.some(
          (w: string) =>
            SECRET_WORDS.includes(w) ||
            SECRET_SUFFIXES.some((s: string) => w.endsWith(s)),
        ) ||
        SECRET_LAST_WORDS.includes(last) ||
        SECRET_PAIRS.some((pair: string[]) => contains(ws, pair)) ||
        extra.some((needle: string[]) => contains(ws, needle))

      if (1111 < known.size) known.clear()
      known.set(key, secret)
    }

    return secret
  }

  function is_secret_key(key: string): boolean {
    if (!active) return false
    const secret = known.get(key)
    return undefined === secret ? matches_key(key) : secret
  }

  function is_secret_path(path: string): boolean {
    return (
      'string' === typeof path &&
      path.split('.').some((part: string) => is_secret_key(part))
    )
  }

  function scrub(str: string): string {
    return str.includes('@') && str.includes('://')
      ? str.replace(URL_CREDENTIALS_RE, (_m: string, prefix: string) => {
        return prefix + mark + '@'
      })
      : str
  }

  function walk(val: any, depth: number, limit: number, state: WalkState): any {
    if (limit < depth || !descend(val)) {
      return val
    }

    const prior = state.seen.get(val)
    if (undefined !== prior) {
      if (IN_PROGRESS !== prior) {
        return prior
      }

      // A cycle back to an object that is still being walked: refer to
      // its copy, so that the output never leads back to the original.
      state.copies = state.copies || new Map()
      let copy = state.copies.get(val)
      if (undefined === copy) {
        copy = shallow(val)
        state.copies.set(val, copy)
      }
      return copy
    }

    state.seen.set(val, IN_PROGRESS)

    let changes: any[] | null = null

    try {
      const keys = Object.keys(val)

      for (let i = 0; i < keys.length; i++) {
        const key = keys[i]
        const child = val[key]
        const type = typeof child

        // Nothing to redact in an empty value or a flag: booleans cannot
        // carry a secret, so flags such as password_set stay readable.
        if (null == child || 'boolean' === type || '' === child) {
          continue
        }

        let secret = known.get(key)
        if (undefined === secret) {
          secret = matches_key(key)
        }

        let out = child

        if (secret) {
          out = mark
        } else if ('string' === type) {
          out = scrub(child)
        } else if ('object' === type) {
          out = walk(child, depth + 1, limit, state)
        }

        if (out !== child) {
          ; (changes = changes || []).push(key, out)
        }
      }

      // The message, stack, cause and (for AggregateError) errors of an
      // error are not enumerable.
      if (val instanceof Error) {
        for (const key of ['message', 'stack']) {
          const text = val[key as 'message' | 'stack']
          if ('string' === typeof text) {
            const out = scrub(text)
            if (out !== text) {
              ; (changes = changes || []).push(key, out)
            }
          }
        }

        for (const key of ['cause', 'errors']) {
          if (
            Object.prototype.hasOwnProperty.call(val, key) &&
            !Object.prototype.propertyIsEnumerable.call(val, key)
          ) {
            const child = (val as any)[key]
            const out =
              'string' === typeof child
                ? scrub(child)
                : null != child && 'object' === typeof child
                  ? walk(child, depth + 1, limit, state)
                  : child
            if (out !== child) {
              ; (changes = changes || []).push(key, out)
            }
          }
        }
      }
    } catch (e: any) {
      // The object cannot be read (a getter or proxy trap threw): leave
      // it as it is.
      changes = null
    }

    const early = state.copies && state.copies.get(val)
    let out = val

    if (changes || early) {
      out = early || shallow(val)
      if (changes) {
        for (let i = 0; i < changes.length; i += 2) {
          out[changes[i]] = changes[i + 1]
        }
      }
    }

    state.seen.set(val, out)
    return out
  }

  const redact: any = function redact(val: any, max_depth?: number): any {
    if (!active) {
      return val
    }

    if ('string' === typeof val) {
      return scrub(val)
    }

    return null == val || 'object' !== typeof val
      ? val
      : walk(val, 0, null == max_depth ? MAX_DEPTH : max_depth, {
        seen: new Map(),
        copies: null,
      })
  }

  // Redact command line arguments: --name=value and --name value where
  // the name looks secret, and credentials in URLs.
  function argv(args: any[]): any[] {
    if (!active || !Array.isArray(args)) return args

    const out = []
    for (let i = 0; i < args.length; i++) {
      const arg = args[i]

      if ('string' !== typeof arg) {
        out.push(arg)
        continue
      }

      const m = arg.match(/^(-{1,2}[^=]+)=/)
      if (m) {
        out.push(
          is_secret_key(arg_name(m[1])) ? m[1] + '=' + mark : scrub(arg),
        )
      } else if (
        /^-{1,2}[^-]/.test(arg) &&
        is_secret_key(arg_name(arg)) &&
        'string' === typeof args[i + 1] &&
        !args[i + 1].startsWith('-')
      ) {
        out.push(arg, mark)
        i++
      } else {
        out.push(scrub(arg))
      }
    }

    return out
  }

  redact.active = active
  redact.mark = mark
  redact.is_secret_key = is_secret_key
  redact.is_secret_path = is_secret_path
  redact.matches_key = matches_key
  redact.argv = argv

  return redact as Redactor
}

// The last segment of a command line option name, as in
// --seneca.options.plugin.provider.apikey.
function arg_name(flag: string): string {
  const parts = flag.replace(/^-+/, '').split('.')
  return parts[parts.length - 1]
}

// Only plain data is walked. Seneca instances, event emitters, binary
// data and other built-in objects are passed through unchanged.
function descend(val: any): boolean {
  try {
    if (Array.isArray(val)) {
      return true
    }

    const proto = Object.getPrototypeOf(val)
    if (null === proto || Object.prototype === proto || val instanceof Error) {
      return true
    }

    return !(
      val.isSeneca ||
      val instanceof EventEmitter ||
      val instanceof Date ||
      val instanceof RegExp ||
      val instanceof Map ||
      val instanceof Set ||
      val instanceof WeakMap ||
      val instanceof WeakSet ||
      val instanceof Promise ||
      val instanceof ArrayBuffer ||
      ArrayBuffer.isView(val) ||
      val instanceof Boolean ||
      val instanceof Number ||
      val instanceof String
    )
  } catch (e: any) {
    return false
  }
}

// Copy an object so that its properties can be replaced. Plain objects
// and arrays are copied directly. Other objects (such as errors and
// entities) keep their prototype and all own properties, including
// non-enumerable ones such as an Error's message.
function shallow(val: any): any {
  if (Array.isArray(val)) {
    return val.slice()
  }

  const proto = Object.getPrototypeOf(val)
  if (Object.prototype === proto) {
    return { ...val }
  }

  if (null === proto) {
    return Object.assign(Object.create(null), val)
  }

  const descriptors: any = Object.getOwnPropertyDescriptors(val)
  for (const key of Reflect.ownKeys(descriptors)) {
    const desc = descriptors[key as any]

    if (desc.get || desc.set) {
      // An accessor (such as the V8 Error stack) may only work on the
      // original object, so the copy holds its current value instead.
      try {
        descriptors[key as any] = {
          value: val[key as any],
          writable: true,
          enumerable: desc.enumerable,
          configurable: true,
        }
      } catch (e: any) {
        delete descriptors[key as any]
      }
    } else {
      desc.configurable = true
      if ('value' in desc) {
        desc.writable = true
      }
    }
  }

  return Object.create(proto, descriptors)
}

// Used when an instance has no redactor of its own.
const default_redactor = make_redactor()

// Redact with an instance's redactor, if it has one.
function redact_with(instance: any, val: any, max_depth?: number): any {
  const redactor = instance && instance.private$ && instance.private$.redact
  return redactor ? redactor(val, max_depth) : val
}

// The type of a value, for error text that must not contain the value.
function type_name(val: any): string {
  return null === val
    ? 'null'
    : Array.isArray(val)
      ? 'array'
      : val instanceof Error
        ? 'error'
        : typeof val
}

// Describe a message for error text, without its values: the keys that
// appear in registered patterns, with their values (as in
// cmd:logn,sys:user), followed by the names of the other keys. Values of
// secret-looking keys are never shown, even with redaction switched off.
function describe_msg(instance: any, msg: any): string {
  if (null == msg || 'object' !== typeof msg || Array.isArray(msg)) {
    return '(' + type_name(msg) + ')'
  }

  const private$ = instance && instance.private$
  const pattern_keys: Set<string> =
    (private$ && private$.pattern_keys) || EMPTY_SET
  const redactor: Redactor = (private$ && private$.redact) || default_redactor

  // Error text never shows secrets, even with redaction switched off.
  const scrubber: Redactor = redactor.active ? redactor : default_redactor

  const shown: string[] = []
  const other: string[] = []

  let keys: string[] = []
  try {
    keys = Object.keys(msg).sort()
  } catch (e: any) {
    keys = []
  }

  for (const key of keys) {
    // Directives (such as default$) are not message data.
    if (key.endsWith('$')) continue

    let val: any
    try {
      val = msg[key]
    } catch (e: any) {
      val = undefined
    }

    if (
      pattern_keys.has(key) &&
      ('string' === typeof val ||
        'number' === typeof val ||
        'boolean' === typeof val) &&
      !redactor.matches_key(key)
    ) {
      // A credential URL in a pattern value is scrubbed.
      let valstr = scrubber(String(val))
      if (MAX_VALUE_LEN < valstr.length) {
        valstr = valstr.substring(0, MAX_VALUE_LEN) + '...'
      }
      shown.push(key + ':' + valstr)
    } else {
      other.push(key)
    }
  }

  return (
    (0 === shown.length ? '{}' : shown.join(',')) +
    (0 === other.length
      ? ''
      : ' (other keys: ' +
      other.slice(0, MAX_OTHER_KEYS).join(', ') +
      (MAX_OTHER_KEYS < other.length ? ', ...' : '') +
      ')')
  )
}

// Describe a list of arguments (as given to seneca.prior) for error text.
function describe_args(instance: any, args: any): string {
  return Array.prototype.slice
    .call(args || [])
    .map((arg: any) => {
      if ('string' === typeof arg) {
        try {
          return describe_msg(instance, Jsonic(arg))
        } catch (e: any) {
          return '(string)'
        }
      }
      return 'object' === typeof arg && null != arg
        ? describe_msg(instance, arg)
        : '(' + type_name(arg) + ')'
    })
    .join(', ')
}

// The error records of a shape (or Gubu) validation error, if it has any.
function shape_errors(err: any): any[] | null {
  if (null == err || !(err.shape || err.gubu)) {
    return null
  }

  try {
    const desc = 'function' === typeof err.desc ? err.desc() : null
    if (desc && Array.isArray(desc.err)) {
      return desc.err
    }
  } catch (e: any) {
    // fall through to the summary properties
  }

  return Array.isArray(err.props)
    ? err.props.map((p: any) => ({ path: p.path, why: p.what, type: p.type }))
    : null
}

// Describe Gubu validation failures without the values (Gubu's own
// error text includes them).
function describe_shape_errors(errs: any[]): string {
  return (errs || []).map(describe_shape_error).join('; ')
}

function describe_shape_error(e: any): string {
  e = e || {}

  const path = null == e.path ? '' : String(e.path)
  const what = '' === path ? 'the value' : 'property "' + path + '"'
  const type = null == e.type ? '' : String(e.type)
  const node = e.node || {}

  // A custom message (Gubu Fault), with the value replaced by its type.
  if ('string' === typeof node.z && '' !== node.z) {
    return node.z
      .replace(/\$VALUE/g, '(' + type_name(e.value) + ')')
      .replace(/\$PATH/g, path)
  }

  if ('required' === e.why) {
    return what + ' is required' + ('' === type ? '' : ' (' + type + ')')
  }

  if ('type' === e.why) {
    return 'instance' === type && node.u && node.u.n
      ? what + ' is not an instance of ' + node.u.n
      : what + ' is not of type ' + type
  }

  if ('closed' === e.why) {
    const extra = e.use && Array.isArray(e.use.k) ? e.use.k : []
    return (
      ('' === path ? 'the object' : 'object "' + path + '"') +
      ' does not allow ' +
      (1 === extra.length ? 'the property "' : 'the properties "') +
      extra.join(', ') +
      '"'
    )
  }

  if ('regexp' === e.why && node.v instanceof RegExp) {
    return what + ' does not match ' + node.v
  }

  if ('never' === e.why) {
    return what + ' is not allowed'
  }

  // A builder (Exact, Min, One and so on) states its rule after the
  // property, as in: Value "x" for property "a" must be one of: b, c.
  // The rule is kept and the value, also in "(was ...)", is left out.
  const text = 'string' === typeof e.text ? e.text : ''
  const marker = '" for property "' + path + '" '
  const at = '' === path ? -1 : text.lastIndexOf(marker)
  if (text.startsWith('Value "') && -1 < at) {
    const rule = text
      .substring(at + marker.length)
      .replace(/\s*\(was [^)]*\)\s*\.?\s*$/, '')
      .replace(/\.\s*$/, '')
    if ('' !== rule) {
      return what + ' ' + rule
    }
  }

  return what + ' failed a validation check' + (e.why ? ' (' + e.why + ')' : '')
}

// The props of a validation error, for error details: the values of
// secret-looking paths are replaced.
function redact_props(props: any, redact: Redactor | null): any[] {
  return (Array.isArray(props) ? props : []).map((p: any) => {
    const out = Object.assign({}, p)
    if (redact && redact.is_secret_path(out.path) && undefined !== out.value) {
      out.value = redact.mark
    }
    return out
  })
}

export type { Redactor, RedactSpec }

export {
  SECRET_KEYS,
  DEFAULT_MARK,
  make_redactor,
  redact_with,
  type_name,
  describe_msg,
  describe_args,
  shape_errors,
  describe_shape_errors,
  redact_props,
}
