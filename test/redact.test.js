/* Copyright (c) 2026 Richard Rodger and other contributors, MIT License */
'use strict'

// Secrets in messages and plugin options must not reach error text,
// error details, log entries, the log event, printed options, transport
// replies or the fatal error report (#954, #955).

const Code = require('@hapi/code')
const Stringify = require('fast-safe-stringify')

const { describe } = require('node:test')
const expect = Code.expect

const Shared = require('./shared')
const it = Shared.make_it()

const Seneca = require('..')
const {
  make_redactor,
  describe_msg,
  describe_args,
  describe_shape_errors,
  SECRET_KEYS,
} = require('../lib/redact')

const SECRET = 'hunter2-secret'

// Run assertions inside a Seneca callback and report failures to fin
// (Seneca captures exceptions thrown by callbacks).
function check(fin, fn) {
  return function (...args) {
    try {
      return fn.apply(this, args)
    } catch (e) {
      fin(e)
    }
  }
}

// A Seneca instance that records every log entry (at all levels) and
// every log event, serialized.
function capture(opts) {
  const lines = []
  const si = Seneca(
    Seneca.util.deep(
      {
        log: 'all',
        internal: {
          logger: function (entry) {
            lines.push(Stringify(entry))
          },
        },
      },
      opts,
    ),
  )
  si.on('log', function (entry) {
    lines.push(Stringify(entry))
  })
  return {
    si,
    lines,
    leaks: () => lines.filter((line) => line.includes(SECRET)),
  }
}

// A transport plugin for type web that passes messages in memory, using
// the same serialization as the network transports.
function make_web_stub() {
  const listeners = {}
  const seen = []
  const wire = []

  function web_stub() {
    const tu = this.export('transport/utils')

    this.add('role:transport,hook:listen,type:web', function (config, ready) {
      seen.push('listen:' + config.type)
      const seneca = this.root.delegate()
      listeners[config.pin] = function (data, respond) {
        const msg = tu.internalize_msg(seneca, JSON.parse(data))
        seneca.act(msg, function (err, out, meta) {
          const rep = JSON.stringify(
            tu.externalize_reply(seneca, err, out, meta),
          )
          wire.push(rep)
          respond(rep)
        })
      }
      ready(config)
    })

    this.add('role:transport,hook:client,type:web', function (config, ready) {
      seen.push('client:' + config.type)
      const seneca = this.root.delegate()
      ready({
        config: config,
        send: function (msg, reply_not_used, meta) {
          const data = JSON.stringify(tu.externalize_msg(seneca, msg, meta))
          listeners[config.pin](data, function (rep) {
            seneca.reply(tu.internalize_reply(seneca, JSON.parse(rep)))
          })
        },
      })
    })
  }

  return { web_stub, seen, wire }
}

describe('redact', function () {
  it('unmatched-message', function (fin) {
    const { si, leaks } = capture()
    si.add('sys:user,cmd:login', function (msg, reply) {
      reply({ ok: true })
    })

    si.act(
      'sys:user,cmd:logn',
      { email: 'alice@example.com', pass: SECRET },
      check(fin, function (err) {
        expect(err.code).equal('act_not_found')
        expect(err.message).equal(
          'seneca: No matching action pattern found for cmd:logn,sys:user ' +
            '(other keys: email, pass), and no default result provided ' +
            '(using a default$ property).',
        )
        expect(Stringify(err)).not.contains(SECRET)
        expect(Stringify(err.details)).not.contains(SECRET)
        expect(leaks()).equal([])
        si.close(fin)
      }),
    )
  })

  it('invalid-message', function (fin) {
    const { si, leaks } = capture()
    si.add(
      { sys: 'user', cmd: 'login', email: String, pass: Number },
      function (msg, reply) {
        reply({ ok: true })
      },
    )

    si.act(
      { sys: 'user', cmd: 'login', pass: SECRET },
      check(fin, function (err) {
        expect(err.code).equal('act_invalid_msg')
        expect(err.message).startsWith(
          'seneca: Action cmd:login,sys:user received an invalid message; ',
        )
        expect(err.message).contains('property "email" is required (string)')
        expect(err.message).contains('property "pass" is not of type number')
        expect(err.message).not.contains(SECRET)
        expect(err.details.props).includes({
          path: 'pass',
          what: 'type',
          type: 'number',
          value: '[REDACTED]',
        })
        expect(Stringify(err)).not.contains(SECRET)
        expect(leaks()).equal([])
        si.close(fin)
      }),
    )
  })

  it('closed-object-message', function (fin) {
    const { si, leaks } = capture()
    const { Closed } = si.valid
    si.add(
      { sys: 'user', cmd: 'login', profile: Closed({ name: String }) },
      function (m, r) {
        r({ ok: true })
      },
    )

    si.act(
      { sys: 'user', cmd: 'login', profile: { name: 'a', pass: SECRET } },
      check(fin, function (err) {
        expect(err.code).equal('act_invalid_msg')
        expect(err.message).equal(
          'seneca: Action cmd:login,sys:user received an invalid message; ' +
            'object "profile" does not allow the property "pass".',
        )
        expect(err.details.props[0].value).equal({
          name: 'a',
          pass: '[REDACTED]',
        })
        expect(Stringify(err)).not.contains(SECRET)
        expect(leaks()).equal([])
        si.close(fin)
      }),
    )
  })

  it('action-timeout', function (fin) {
    const { si, leaks } = capture({ timeout: 111 })
    si.add('sys:user,cmd:login', function (msg, reply) {
      setTimeout(() => reply({ ok: true }), 333)
    })

    si.act(
      'sys:user,cmd:login',
      { pass: SECRET },
      check(fin, function (err) {
        expect(err.code).equal('action_timeout')
        expect(err.details.desc).equal('cmd:login,sys:user (other keys: pass)')
        expect(err.details.message).equal({
          sys: 'user',
          cmd: 'login',
          pass: '[REDACTED]',
        })
        expect(err.message).contains(
          'Message was: cmd:login,sys:user (other keys: pass).',
        )
        expect(Stringify(err)).not.contains(SECRET)
        setTimeout(() => {
          expect(leaks()).equal([])
          si.close(fin)
        }, 444)
      }),
    )
  })

  it('action-error', function (fin) {
    const { si, leaks } = capture()
    si.add('sys:user,cmd:login', function (msg, reply) {
      reply(new Error('bad password'))
    })

    si.act(
      'sys:user,cmd:login',
      { pass: SECRET },
      check(fin, function (err) {
        expect(err.message).equal('bad password')
        expect(leaks()).equal([])
        si.close(fin)
      }),
    )
  })

  it('result-not-object', function (fin) {
    const { si, leaks } = capture()
    si.add('sys:user,cmd:token', function (msg, reply) {
      reply(null, SECRET)
    })

    si.act(
      'sys:user,cmd:token',
      { pass: SECRET },
      check(fin, function (err) {
        expect(err.code).equal('result_not_objarr')
        expect(err.message).contains('(type: string)')
        expect(err.message).contains('the message was: cmd:token,sys:user')
        expect(Stringify(err)).not.contains(SECRET)
        expect(leaks()).equal([])
        si.close(fin)
      }),
    )
  })

  it('default-not-object', function (fin) {
    const { si } = capture()
    si.act(
      'sys:user,cmd:none',
      { default$: SECRET },
      check(fin, function (err) {
        expect(err.code).equal('act_default_bad')
        expect(err.message).contains('(type: string)')
        expect(Stringify(err)).not.contains(SECRET)
        si.close(fin)
      }),
    )
  })

  it('closed-instance', function (fin) {
    const { si, leaks } = capture()
    si.add('sys:user,cmd:login', function (msg, reply) {
      reply({ ok: true })
    })
    si.ready(
      check(fin, function () {
        si.close(function () {
          si.act(
            'sys:user,cmd:login',
            { pass: SECRET },
            check(fin, function (err) {
              expect(err.code).equal('closed')
              expect(err.message).equal(
                'seneca: The Seneca instance is closed and cannot process the ' +
                  'message: cmd:login,sys:user (other keys: pass).',
              )
              expect(leaks()).equal([])
              fin()
            }),
          )
        })
      }),
    )
  })

  it('prior-outside-action', function (fin) {
    const { si } = capture()
    try {
      si.prior({ sys: 'user', cmd: 'login', pass: SECRET })
      fin(new Error('expected an error'))
    } catch (err) {
      expect(err.code).equal('no_prior_action')
      expect(err.message).contains('cmd:login,sys:user (other keys: pass)')
      expect(Stringify(err)).not.contains(SECRET)
      si.close(fin)
    }
  })

  it('plugin-options', function (fin) {
    const printed = []
    const { si, lines, leaks } = capture({
      debug: { print: { options: true } },
      internal: { print: { log: (...args) => printed.push(args.join(' ')) } },
      plugin: { other: { token: SECRET } },
    })

    function provider(options) {
      this.add('sys:provider,get:info', function (msg, reply) {
        reply({ ok: true })
      })
      return { exports: { keys: options.keys } }
    }

    function other() {}

    si.use(provider, {
      keys: { apikey: SECRET, client_secret: SECRET },
      url: 'redis://user:' + SECRET + '@localhost:6379',
      password_set: true,
    }).use(other)

    si.ready(
      check(fin, function () {
        // Redaction never modifies the data itself.
        expect(si.export('provider/keys')).equal({
          apikey: SECRET,
          client_secret: SECRET,
        })

        expect(leaks()).equal([])
        expect(
          lines.some((line) => line.includes('"password_set":true')),
        ).true()
        expect(
          lines.some((line) => line.includes('redis://user:[REDACTED]@')),
        ).true()

        const printout = printed.join('\n')
        expect(printout).contains('Seneca Options')
        expect(printout).contains('[REDACTED]')
        expect(printout).not.contains(SECRET)

        si.close(fin)
      }),
    )
  })

  it('plugin-option-invalid', function (fin) {
    const { si, leaks } = capture({ debug: { undead: true } })

    function provider() {}
    provider.defaults = { apikey: String, port: Number }

    si.error(
      check(fin, function (err) {
        expect(err.code).equal('invalid_plugin_option')
        expect(err.message).equal(
          'seneca: Plugin provider: option value is not valid: ' +
            'property "port" is not of type number.',
        )
        expect(err.details.options.apikey).equal('[REDACTED]')
        expect(Stringify(err)).not.contains(SECRET)
        expect(leaks()).equal([])
        si.close(fin)
      }),
    )

    si.use(provider, { apikey: SECRET, port: 'eighty' })
  })

  it('plugin-define-throws', function (fin) {
    const { si, leaks } = capture({ debug: { undead: true } })

    function provider() {
      throw new Error('cannot reach the provider')
    }

    si.error(
      check(fin, function (err) {
        expect(err.code).equal('plugin_define_failed')
        expect(err.details.options.apikey).equal('[REDACTED]')
        expect(Stringify(err)).not.contains(SECRET)
        expect(leaks()).equal([])
        si.close(fin)
      }),
    )

    si.use(provider, { apikey: SECRET })
  })

  it('fatal-report', function (fin) {
    // In test mode a fatal error prints a report to stderr.
    const printed = []
    const console_error = console.error
    console.error = (...args) => printed.push(args.join(' '))
    let exits = 0

    const si = Seneca({
      test: true,
      log: 'silent',
      death_delay: 222,
      internal: { print: { log: () => {}, err: () => {} } },
      system: { exit: () => exits++ },
    })

    si.add('sys:user,cmd:login', function () {
      const err = new Error('cannot reach the provider')
      err.details = { token: SECRET }
      throw err
    })

    si.act('sys:user,cmd:login,fatal$:true', { pass: SECRET })

    // The report is printed on close and again after the death delay.
    setTimeout(() => {
      console.error = console_error
      const report = printed.join('\n')
      try {
        expect(0 < exits).true()
        expect(report).contains('SENECA FATAL ERROR')
        expect(report).contains('[REDACTED]')
        expect(report).not.contains(SECRET)
        fin()
      } catch (e) {
        fin(e)
      }
    }, 666)
  })

  it('log-event', function (fin) {
    // Listeners receive every entry, before level filtering.
    const si = Seneca({ log: 'silent' })
    const entries = []
    si.on('log', (entry) => entries.push(Stringify(entry)))

    si.use(function provider() {}, { apikey: SECRET })
    si.add('sys:user,cmd:login', function (msg, reply) {
      reply({ ok: true })
    })

    si.act(
      'sys:user,cmd:login',
      { pass: SECRET },
      check(fin, function () {
        expect(
          entries.some((entry) => entry.includes('"case":"DEFINE"')),
        ).true()
        expect(entries.some((entry) => entry.includes('"case":"IN"'))).true()
        expect(entries.filter((entry) => entry.includes(SECRET))).equal([])
        si.close(fin)
      }),
    )
  })

  it('redact-option', function (fin) {
    const { si, lines, leaks } = capture({
      redact: { keys: ['pin'], mark: '***' },
    })
    si.add('sys:user,cmd:login', function (msg, reply) {
      reply({ ok: true })
    })

    si.act(
      'sys:user,cmd:login',
      { pin: SECRET, pass: SECRET },
      check(fin, function () {
        expect(leaks()).equal([])
        expect(lines.some((line) => line.includes('"pin":"***"'))).true()
        si.close(fin)
      }),
    )
  })

  it('redact-option-inactive', function (fin) {
    const { si, leaks } = capture({ redact: { active: false } })
    si.add('sys:user,cmd:login', function (msg, reply) {
      reply({ ok: true })
    })

    si.act(
      'sys:user,cmd:login',
      { pass: SECRET },
      check(fin, function () {
        expect(0 < leaks().length).true()
        si.close(fin)
      }),
    )
  })

  it('redact-option-update', function (fin) {
    const { si, lines, leaks } = capture()
    si.options({ redact: { keys: ['pin'] } })
    si.add('sys:user,cmd:login', function (msg, reply) {
      reply({ ok: true })
    })

    si.act(
      'sys:user,cmd:login',
      { pin: SECRET },
      check(fin, function () {
        expect(leaks()).equal([])
        expect(lines.some((line) => line.includes('"pin":"[REDACTED]"'))).true()
        si.close(fin)
      }),
    )
  })

  it('redact-option-same-call', function (fin) {
    const { si, leaks } = capture()
    si.options({
      redact: { keys: ['dsn'] },
      plugin: { db: { dsn: SECRET } },
    })
    si.ready(
      check(fin, function () {
        expect(leaks()).equal([])
        si.close(fin)
      }),
    )
  })

  it('error-text-without-redaction', function (fin) {
    const si = Seneca({ log: 'silent', redact: { active: false } })
    si.add('role:auth,cmd:login,token:*', function (msg, reply) {
      reply({ ok: true })
    })

    si.act(
      'role:auth,cmd:logn',
      { token: SECRET },
      check(fin, function (err) {
        expect(err.code).equal('act_not_found')
        expect(err.message).contains('cmd:logn,role:auth (other keys: token)')
        expect(err.message).not.contains(SECRET)
        si.close(fin)
      }),
    )
  })

  it('custom-validation-message', function (fin) {
    const { si } = capture()
    const { Fault, Check, Exact } = si.valid
    si.add(
      {
        a: 1,
        port: Fault(
          'port must be between 1 and 65535, got $VALUE at $PATH',
          Check((v) => 0 < v && v < 65536),
        ),
        mode: Exact('fast', 'slow'),
      },
      function (m, r) {
        r({ ok: true })
      },
    )

    si.act(
      { a: 1, port: 0, mode: 'odd' },
      check(fin, function (err) {
        expect(err.code).equal('act_invalid_msg')
        expect(err.message).contains(
          'port must be between 1 and 65535, got (number) at port',
        )
        expect(err.message).contains(
          'property "mode" must be exactly one of: fast, slow',
        )
        expect(err.message).not.contains('odd')
        si.close(fin)
      }),
    )
  })

  it('transport-error-reply', function (fin) {
    const stub = make_web_stub()
    const server = capture({ tag: 'server' })
    const client = capture({ tag: 'client' })

    server.si
      .use(stub.web_stub)
      .add('sys:user,cmd:login', function (msg, reply) {
        reply({ ok: true })
      })
      .listen({ pin: 'sys:user,cmd:*' })

    server.si.ready(
      check(fin, function () {
        client.si.use(stub.web_stub).client({ pin: 'sys:user,cmd:*' })

        client.si.ready(
          check(fin, function () {
            client.si.act(
              'sys:user,cmd:logn',
              { pass: SECRET },
              check(fin, function (err) {
                expect(err.code).equal('act_not_found')
                expect(err.message).contains(
                  'cmd:logn,sys:user (other keys: pass)',
                )
                expect(Stringify(err)).not.contains(SECRET)
                expect(stub.wire.length).equal(1)
                expect(stub.wire[0]).not.contains(SECRET)
                expect(server.leaks()).equal([])
                expect(client.leaks()).equal([])
                client.si.close(() => server.si.close(fin))
              }),
            )
          }),
        )
      }),
    )
  })

  it('redactor', function () {
    const redact = make_redactor()

    // Input is not modified; unchanged parts are shared.
    const shared = { a: [1, 2, { b: 'x' }] }
    const input = {
      user: { name: 'alice', pass: SECRET },
      shared,
      list: [{ token: SECRET }, 'plain'],
      flag: { password_set: true },
      empty: { pass: '' },
    }
    const out = redact(input)
    expect(input.user.pass).equal(SECRET)
    expect(out.user).equal({ name: 'alice', pass: '[REDACTED]' })
    expect(out.shared).shallow.equal(shared)
    expect(out.list).equal([{ token: '[REDACTED]' }, 'plain'])
    expect(out.flag).shallow.equal(input.flag)
    expect(out.empty).shallow.equal(input.empty)
    expect(redact(shared)).shallow.equal(shared)
    expect(redact(null)).equal(null)
    expect(redact('plain')).equal('plain')
    expect(redact(1)).equal(1)

    // Secret objects are replaced whole.
    expect(redact({ credentials: { user: 'u', key: SECRET } })).equal({
      credentials: '[REDACTED]',
    })

    // Key names are matched by words.
    for (const key of [
      'pass',
      'user_pass',
      'password',
      'PASSWD',
      'password1',
      'dbPassword',
      'passphrase',
      'secret',
      'client_secret',
      'clientsecret',
      'token',
      'refreshToken',
      'access-token',
      'accesstoken',
      'apikey',
      'apiKey',
      'api_key',
      'X-API-KEY',
      'APIKey',
      'private_key',
      'privateKey',
      'signingKey',
      'secret_key',
      'Authorization',
      'auth',
      'basic_auth',
      'pwd',
      'db_pwd',
      'credentials',
      'cookie',
      'set-cookie',
    ]) {
      expect(redact.is_secret_key(key), key).true()
    }
    for (const key of [
      'name',
      'email',
      'author',
      'auth_url',
      'key',
      'cache_key',
      'id',
      'cmd',
      'role',
      'max_tokens',
      'input_tokens',
      'tokenizer',
      'passenger',
      'passport',
      'bypass',
      'compass',
      '',
    ]) {
      expect(redact.is_secret_key(key), key).false()
    }
    expect(redact.is_secret_key(1)).false()
    expect(SECRET_KEYS).includes('pass')
    expect(redact.is_secret_path('keys.apikey')).true()
    expect(redact.is_secret_path('keys.id')).false()

    // URL credentials.
    expect(redact('redis://user:' + SECRET + '@host:6379/0')).equal(
      'redis://user:[REDACTED]@host:6379/0',
    )
    expect(redact('see postgres://:' + SECRET + '@db/x and more')).equal(
      'see postgres://:[REDACTED]@db/x and more',
    )
    expect(redact('mongodb://u:p@ss@host/db')).equal(
      'mongodb://u:[REDACTED]@host/db',
    )
    expect(redact('redis://:pw@host:6379?x=a@b')).equal(
      'redis://:[REDACTED]@host:6379?x=a@b',
    )
    expect(redact('https://example.com/a@b')).equal('https://example.com/a@b')
    expect(redact('mailto:alice@example.com')).equal('mailto:alice@example.com')

    // Cycles map to the copies.
    const a = { name: 'a' }
    const b = { pass: SECRET, a }
    a.b = b
    const ca = redact(a)
    expect(ca).not.shallow.equal(a)
    expect(ca.b.pass).equal('[REDACTED]')
    expect(ca.b.a).shallow.equal(ca)
    expect(Stringify(ca)).not.contains(SECRET)
    expect(a.b.pass).equal(SECRET)

    // Cycles without secrets.
    const c = { name: 'c' }
    c.self = c
    const cc = redact(c)
    expect(cc.self).shallow.equal(cc)

    // Errors keep their type, message and stack.
    const err = new Error('boom')
    err.code = 'x'
    err.details = { token: SECRET }
    const cerr = redact(err)
    expect(cerr).not.shallow.equal(err)
    expect(cerr instanceof Error).true()
    expect(cerr.message).equal('boom')
    expect(cerr.stack).equal(err.stack)
    expect(cerr.code).equal('x')
    expect(cerr.details.token).equal('[REDACTED]')
    expect(err.details.token).equal(SECRET)

    // Credentials in an error's message and stack are replaced.
    const cfail = new Error('connect failed postgres://bob:' + SECRET + '@db/x')
    const ccfail = redact({ err: cfail }).err
    expect(ccfail instanceof Error).true()
    expect(ccfail.message).equal(
      'connect failed postgres://bob:[REDACTED]@db/x',
    )
    expect(ccfail.stack).not.contains(SECRET)
    expect(cfail.message).contains(SECRET)

    // Class instances keep their prototype.
    class Entity {
      canon() {
        return 'sys/user'
      }
    }
    const ent = new Entity()
    ent.pass = SECRET
    const cent = redact(ent)
    expect(cent instanceof Entity).true()
    expect(cent.canon()).equal('sys/user')
    expect(cent.pass).equal('[REDACTED]')

    // Frozen objects.
    expect(redact(Object.freeze({ pass: SECRET })).pass).equal('[REDACTED]')

    // Seneca instances and built-in objects are not walked.
    const si = Seneca({ log: 'silent' })
    const when = new Date()
    const map = new Map([['pass', SECRET]])
    const held = redact({ seneca: si, when, map, buf: Buffer.from('x') })
    expect(held.seneca).shallow.equal(si)
    expect(held.when).shallow.equal(when)
    expect(held.map).shallow.equal(map)

    // Null-prototype objects.
    const bare = Object.create(null)
    bare.pass = SECRET
    const cbare = redact(bare)
    expect(Object.getPrototypeOf(cbare)).equal(null)
    expect(cbare.pass).equal('[REDACTED]')

    // A getter that throws leaves its object as it is.
    const bad = {
      pass: SECRET,
      get boom() {
        throw new Error('boom')
      },
    }
    expect(redact({ bad }).bad).shallow.equal(bad)

    // Own accessors of class instances are copied as values; one that
    // throws is left out of the copy.
    class Account {}
    const acc = new Account()
    acc.token = SECRET
    Object.defineProperty(acc, 'owner', { get: () => 'alice' })
    Object.defineProperty(acc, 'broken', {
      get: () => {
        throw new Error('broken')
      },
    })
    const cacc = redact(acc)
    expect(cacc instanceof Account).true()
    expect(cacc.token).equal('[REDACTED]')
    expect(cacc.owner).equal('alice')
    expect(Object.getOwnPropertyDescriptor(cacc, 'broken')).not.exist()

    // Objects whose keys cannot be listed are passed through.
    const unlisted = new Proxy(
      { pass: SECRET },
      {
        ownKeys() {
          throw new Error('no')
        },
      },
    )
    expect(redact({ unlisted }).unlisted === unlisted).true()

    // Objects whose type cannot be checked are passed through.
    const hostile = new Proxy(
      { pass: SECRET },
      {
        getPrototypeOf() {
          throw new Error('no')
        },
      },
    )
    expect(redact({ hostile }).hostile === hostile).true()

    // Very deep data is passed through.
    let deep = { pass: SECRET }
    for (let i = 0; i < 33; i++) deep = { next: deep }
    expect(redact(deep)).shallow.equal(deep)

    // A depth limit leaves deeper data as it is.
    const nested = { a: { pass: SECRET }, b: { c: { pass: SECRET } } }
    const limited = redact(nested, 1)
    expect(limited.a.pass).equal('[REDACTED]')
    expect(limited.b.c).shallow.equal(nested.b.c)

    // Inactive, custom keys and mark.
    const off = make_redactor({ active: false })
    expect(off(input)).shallow.equal(input)
    expect(off.is_secret_key('pass')).false()
    expect(off.matches_key('pass')).true()
    const custom = make_redactor({ keys: ['pin', ''], mark: '***' })
    expect(custom({ pin: 1234, pass: 'x' })).equal({ pin: '***', pass: '***' })

    // Command line arguments.
    expect(
      redact.argv([
        'node',
        'app.js',
        '--seneca.options.plugin.provider.apikey=' + SECRET,
        '--password',
        SECRET,
        '--db=redis://u:' + SECRET + '@h',
        '--port',
        '80',
        3,
      ]),
    ).equal([
      'node',
      'app.js',
      '--seneca.options.plugin.provider.apikey=[REDACTED]',
      '--password',
      '[REDACTED]',
      '--db=redis://u:[REDACTED]@h',
      '--port',
      '80',
      3,
    ])
    expect(off.argv(['--pass=x'])).equal(['--pass=x'])

    si.close()
  })

  it('describe', function () {
    const si = Seneca({ log: 'silent' }).add(
      'sys:user,cmd:login,token:abc',
      function (msg, reply) {
        reply({})
      },
    )

    expect(
      describe_msg(si, {
        sys: 'user',
        cmd: 'logn',
        email: 'a@example.com',
        pass: SECRET,
        token: SECRET,
        nested: { a: 1 },
        default$: {},
      }),
    ).equal('cmd:logn,sys:user (other keys: email, nested, pass, token)')
    expect(describe_msg(si, { foo: 1 })).equal('{} (other keys: foo)')
    expect(describe_msg(si, { cmd: 'x'.repeat(50) })).equal(
      'cmd:' + 'x'.repeat(44) + '...',
    )
    expect(describe_msg(si, null)).equal('(null)')
    expect(describe_msg(si, [1])).equal('(array)')
    expect(describe_msg(null, { a: 1 })).equal('{} (other keys: a)')

    // A property that cannot be read is named only.
    const odd = {
      get cmd() {
        throw new Error('no')
      },
    }
    expect(describe_msg(si, odd)).equal('{} (other keys: cmd)')
    const unlisted = new Proxy(
      {},
      {
        ownKeys() {
          throw new Error('no')
        },
      },
    )
    expect(describe_msg(si, unlisted)).equal('{}')

    const many = {}
    for (let i = 0; i < 30; i++) many['k' + i] = i
    expect(describe_msg(si, many)).endsWith(', ...)')

    expect(
      describe_args(si, ['sys:user,cmd:x,pass:' + SECRET, '}', () => {}, 1]),
    ).equal('cmd:x,sys:user (other keys: pass), (string), (function), (number)')

    // Validation errors without Gubu records use the summary properties.
    const { shape_errors } = require('../lib/redact')
    expect(shape_errors(null)).equal(null)
    expect(shape_errors(new Error('x'))).equal(null)
    expect(
      shape_errors({
        gubu: true,
        desc: () => {
          throw new Error('no')
        },
        props: [{ path: 'a', what: 'type', type: 'number', value: 1 }],
      }),
    ).equal([{ path: 'a', why: 'type', type: 'number' }])
    expect(shape_errors({ gubu: true })).equal(null)

    expect(
      describe_shape_errors([
        { path: 'a', why: 'required', type: 'string' },
        { path: 'b', why: 'required' },
        { path: 'c', why: 'type', type: 'number' },
        { path: '', why: 'closed', use: { k: ['x', 'y'] } },
        { path: 'd', why: 'closed', use: { k: ['z'] } },
        { path: 'e', why: 'check' },
        { path: '' },
        null,
      ]),
    ).equal(
      'property "a" is required (string); property "b" is required; ' +
        'property "c" is not of type number; the object does not allow the ' +
        'properties "x, y"; object "d" does not allow the property "z"; ' +
        'property "e" failed a validation check (check); the value failed a ' +
        'validation check; the value failed a validation check',
    )

    expect(
      describe_shape_errors([
        {
          path: 'a',
          why: 'check',
          text: 'Value "z" for property "a" must be exactly one of: x, y',
        },
        {
          path: 'b',
          why: 'check',
          text: 'Value "1" for property "b" must be a minimum of 5 (was 1).',
        },
        {
          path: 'c',
          why: 'check',
          text: 'Value "" for property "c" (was 1).',
        },
        { path: 'd', why: 'regexp', node: { v: /^x+$/ } },
        { path: 'e', why: 'never' },
        {
          path: 'f',
          why: 'type',
          type: 'instance',
          node: { u: { n: 'Date' } },
        },
        {
          path: 'g',
          why: 'check',
          node: { z: 'g must be positive, got $VALUE at $PATH' },
          value: -1,
        },
      ]),
    ).equal(
      'property "a" must be exactly one of: x, y; ' +
        'property "b" must be a minimum of 5; ' +
        'property "c" failed a validation check (check); ' +
        'property "d" does not match /^x+$/; property "e" is not allowed; ' +
        'property "f" is not an instance of Date; ' +
        'g must be positive, got (number) at g',
    )

    si.close()
  })
})
