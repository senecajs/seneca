/* Copyright (c) 2026 Richard Rodger and other contributors, MIT License */
'use strict'

// Secrets in messages and plugin options must not reach error text,
// error details, log entries, the log event, printed options, transport
// replies or the fatal error report (#954, #955).

const assert = require('node:assert/strict')
const { isDeepStrictEqual } = require('node:util')
const Stringify = require('fast-safe-stringify')

const { describe, it } = require('node:test')

const Seneca = require('..')
const { Deprecate } = require('../lib/deprecate')
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
  it('unmatched-message', function (t, fin) {
    const { si, leaks } = capture()
    si.add('sys:user,cmd:login', function (msg, reply) {
      reply({ ok: true })
    })

    si.act(
      'sys:user,cmd:logn',
      { email: 'alice@example.com', pass: SECRET },
      check(fin, function (err) {
        assert.deepStrictEqual(err.code, 'act_not_found')
        assert.deepStrictEqual(
          err.message,
          'seneca: No matching action pattern found for cmd:logn,sys:user ' +
            '(other keys: email, pass), and no default result provided ' +
            '(using a default$ property).',
        )
        assert.ok(!Stringify(err).includes(SECRET))
        assert.ok(!Stringify(err.details).includes(SECRET))
        assert.deepStrictEqual(leaks(), [])
        si.close(fin)
      }),
    )
  })

  it('invalid-message', function (t, fin) {
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
        assert.deepStrictEqual(err.code, 'act_invalid_msg')
        assert.ok(
          err.message.startsWith(
            'seneca: Action cmd:login,sys:user received an invalid message; ',
          ),
        )
        assert.ok(err.message.includes('property "email" is required (string)'))
        assert.ok(err.message.includes('property "pass" is not of type number'))
        assert.ok(!err.message.includes(SECRET))
        assert.ok(
          err.details.props.some((x) =>
            isDeepStrictEqual(x, {
              path: 'pass',
              what: 'type',
              type: 'number',
              value: '[REDACTED]',
            }),
          ),
        )
        assert.ok(!Stringify(err).includes(SECRET))
        assert.deepStrictEqual(leaks(), [])
        si.close(fin)
      }),
    )
  })

  it('closed-object-message', function (t, fin) {
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
        assert.deepStrictEqual(err.code, 'act_invalid_msg')
        assert.deepStrictEqual(
          err.message,
          'seneca: Action cmd:login,sys:user received an invalid message; ' +
            'object "profile" does not allow the property "pass".',
        )
        assert.deepStrictEqual(err.details.props[0].value, {
          name: 'a',
          pass: '[REDACTED]',
        })
        assert.ok(!Stringify(err).includes(SECRET))
        assert.deepStrictEqual(leaks(), [])
        si.close(fin)
      }),
    )
  })

  it('action-timeout', function (t, fin) {
    const { si, leaks } = capture({ timeout: 111 })
    si.add('sys:user,cmd:login', function (msg, reply) {
      setTimeout(() => reply({ ok: true }), 333)
    })

    si.act(
      'sys:user,cmd:login',
      { pass: SECRET },
      check(fin, function (err) {
        assert.deepStrictEqual(err.code, 'action_timeout')
        assert.deepStrictEqual(
          err.details.desc,
          'cmd:login,sys:user (other keys: pass)',
        )
        assert.deepStrictEqual(err.details.message, {
          sys: 'user',
          cmd: 'login',
          pass: '[REDACTED]',
        })
        assert.ok(
          err.message.includes(
            'Message was: cmd:login,sys:user (other keys: pass).',
          ),
        )
        assert.ok(!Stringify(err).includes(SECRET))
        setTimeout(() => {
          assert.deepStrictEqual(leaks(), [])
          si.close(fin)
        }, 444)
      }),
    )
  })

  it('action-error', function (t, fin) {
    const { si, leaks } = capture()
    si.add('sys:user,cmd:login', function (msg, reply) {
      reply(new Error('bad password'))
    })

    si.act(
      'sys:user,cmd:login',
      { pass: SECRET },
      check(fin, function (err) {
        assert.deepStrictEqual(err.message, 'bad password')
        assert.deepStrictEqual(leaks(), [])
        si.close(fin)
      }),
    )
  })

  it('result-not-object', function (t, fin) {
    const { si, leaks } = capture()
    si.add('sys:user,cmd:token', function (msg, reply) {
      reply(null, SECRET)
    })

    si.act(
      'sys:user,cmd:token',
      { pass: SECRET },
      check(fin, function (err) {
        assert.deepStrictEqual(err.code, 'result_not_objarr')
        assert.ok(err.message.includes('(type: string)'))
        assert.ok(err.message.includes('the message was: cmd:token,sys:user'))
        assert.ok(!Stringify(err).includes(SECRET))
        assert.deepStrictEqual(leaks(), [])
        si.close(fin)
      }),
    )
  })

  it('default-not-object', function (t, fin) {
    const { si } = capture()
    si.act(
      'sys:user,cmd:none',
      { default$: SECRET },
      check(fin, function (err) {
        assert.deepStrictEqual(err.code, 'act_default_bad')
        assert.ok(err.message.includes('(type: string)'))
        assert.ok(!Stringify(err).includes(SECRET))
        si.close(fin)
      }),
    )
  })

  it('closed-instance', function (t, fin) {
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
              assert.deepStrictEqual(err.code, 'closed')
              assert.deepStrictEqual(
                err.message,
                'seneca: The Seneca instance is closed and cannot process the ' +
                  'message: cmd:login,sys:user (other keys: pass).',
              )
              assert.deepStrictEqual(leaks(), [])
              fin()
            }),
          )
        })
      }),
    )
  })

  it('prior-outside-action', function (t, fin) {
    const { si } = capture()
    try {
      si.prior({ sys: 'user', cmd: 'login', pass: SECRET })
      fin(new Error('expected an error'))
    } catch (err) {
      assert.deepStrictEqual(err.code, 'no_prior_action')
      assert.ok(err.message.includes('cmd:login,sys:user (other keys: pass)'))
      assert.ok(!Stringify(err).includes(SECRET))
      si.close(fin)
    }
  })

  it('plugin-options', function (t, fin) {
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
        assert.deepStrictEqual(si.export('provider/keys'), {
          apikey: SECRET,
          client_secret: SECRET,
        })

        assert.deepStrictEqual(leaks(), [])
        assert.strictEqual(
          lines.some((line) => line.includes('"password_set":true')),
          true,
        )
        assert.strictEqual(
          lines.some((line) => line.includes('redis://user:[REDACTED]@')),
          true,
        )

        const printout = printed.join('\n')
        assert.ok(printout.includes('Seneca Options'))
        assert.ok(printout.includes('[REDACTED]'))
        assert.ok(!printout.includes(SECRET))

        si.close(fin)
      }),
    )
  })

  it('plugin-option-invalid', function (t, fin) {
    const { si, leaks } = capture({ debug: { undead: true } })

    function provider() {}
    provider.defaults = { apikey: String, port: Number }

    si.error(
      check(fin, function (err) {
        assert.deepStrictEqual(err.code, 'invalid_plugin_option')
        assert.deepStrictEqual(
          err.message,
          'seneca: Plugin provider: option value is not valid: ' +
            'property "port" is not of type number.',
        )
        assert.deepStrictEqual(err.details.options.apikey, '[REDACTED]')
        assert.ok(!Stringify(err).includes(SECRET))
        assert.deepStrictEqual(leaks(), [])
        si.close(fin)
      }),
    )

    si.use(provider, { apikey: SECRET, port: 'eighty' })
  })

  it('plugin-define-throws', function (t, fin) {
    const { si, leaks } = capture({ debug: { undead: true } })

    function provider() {
      throw new Error('cannot reach the provider')
    }

    si.error(
      check(fin, function (err) {
        assert.deepStrictEqual(err.code, 'plugin_define_failed')
        assert.deepStrictEqual(err.details.options.apikey, '[REDACTED]')
        assert.ok(!Stringify(err).includes(SECRET))
        assert.deepStrictEqual(leaks(), [])
        si.close(fin)
      }),
    )

    si.use(provider, { apikey: SECRET })
  })

  it('fatal-report', function (t, fin) {
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
      const err = new Error('cannot reach postgres://u:' + SECRET + '@db/x')
      err.details = { token: SECRET }
      throw err
    })

    si.act('sys:user,cmd:login,fatal$:true', { pass: SECRET })

    // The report is printed on close and again after the death delay.
    setTimeout(() => {
      console.error = console_error
      const report = printed.join('\n')
      try {
        assert.strictEqual(0 < exits, true)
        assert.ok(report.includes('SENECA FATAL ERROR'))
        assert.ok(report.includes('postgres://u:[REDACTED]@db/x'))
        assert.ok(report.includes('[REDACTED]'))
        assert.ok(!report.includes(SECRET))
        fin()
      } catch (e) {
        fin(e)
      }
    }, 666)
  })

  it('log-event', function (t, fin) {
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
        assert.strictEqual(
          entries.some((entry) => entry.includes('"case":"DEFINE"')),
          true,
        )
        assert.strictEqual(
          entries.some((entry) => entry.includes('"case":"IN"')),
          true,
        )
        assert.deepStrictEqual(
          entries.filter((entry) => entry.includes(SECRET)),
          [],
        )
        si.close(fin)
      }),
    )
  })

  it('redact-option', function (t, fin) {
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
        assert.deepStrictEqual(leaks(), [])
        assert.strictEqual(
          lines.some((line) => line.includes('"pin":"***"')),
          true,
        )
        si.close(fin)
      }),
    )
  })

  it('redact-option-inactive', function (t, fin) {
    const { si, leaks } = capture({ redact: { active: false } })
    si.add('sys:user,cmd:login', function (msg, reply) {
      reply({ ok: true })
    })

    si.act(
      'sys:user,cmd:login',
      { pass: SECRET },
      check(fin, function () {
        assert.strictEqual(0 < leaks().length, true)
        si.close(fin)
      }),
    )
  })

  it('redact-option-update', function (t, fin) {
    const { si, lines, leaks } = capture()
    si.options({ redact: { keys: ['pin'] } })
    si.add('sys:user,cmd:login', function (msg, reply) {
      reply({ ok: true })
    })

    si.act(
      'sys:user,cmd:login',
      { pin: SECRET },
      check(fin, function () {
        assert.deepStrictEqual(leaks(), [])
        assert.strictEqual(
          lines.some((line) => line.includes('"pin":"[REDACTED]"')),
          true,
        )
        si.close(fin)
      }),
    )
  })

  it('redact-option-same-call', function (t, fin) {
    const { si, leaks } = capture()
    si.options({
      redact: { keys: ['dsn'] },
      plugin: { db: { dsn: SECRET } },
    })
    si.ready(
      check(fin, function () {
        assert.deepStrictEqual(leaks(), [])
        si.close(fin)
      }),
    )
  })

  it('error-text-without-redaction', function (t, fin) {
    const si = Seneca({ log: 'silent', redact: { active: false } })
    si.add('role:auth,cmd:login,token:*', function (msg, reply) {
      reply({ ok: true })
    })

    si.act(
      'role:auth,cmd:logn',
      { token: SECRET },
      check(fin, function (err) {
        assert.deepStrictEqual(err.code, 'act_not_found')
        assert.ok(
          err.message.includes('cmd:logn,role:auth (other keys: token)'),
        )
        assert.ok(!err.message.includes(SECRET))
        si.close(fin)
      }),
    )
  })

  it('custom-validation-message', function (t, fin) {
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
        assert.deepStrictEqual(err.code, 'act_invalid_msg')
        assert.ok(
          err.message.includes(
            'port must be between 1 and 65535, got (number) at port',
          ),
        )
        assert.ok(
          err.message.includes(
            'property "mode" must be exactly one of: fast, slow',
          ),
        )
        assert.ok(!err.message.includes('odd'))
        si.close(fin)
      }),
    )
  })

  it('transport-action-error-reply', function (t, fin) {
    const stub = make_web_stub()
    const server = capture({ tag: 'server' })
    const client = capture({ tag: 'client' })

    server.si
      .use(stub.web_stub)
      .add('sys:user,cmd:login', function (msg, reply) {
        // The action still receives the real value.
        const err = new Error('bad password')
        err.details = { attempt: { pass: msg.pass, ok: SECRET === msg.pass } }
        reply(err)
      })
      .listen({ pin: 'sys:user,cmd:*' })

    server.si.ready(function () {
      client.si.use(stub.web_stub).client({ pin: 'sys:user,cmd:*' })

      client.si.ready(function () {
        client.si.act(
          'sys:user,cmd:login',
          { pass: SECRET },
          check(fin, function (err) {
            assert.equal(err.message, 'bad password')
            assert.equal(stub.wire.length, 1)
            assert.ok(!stub.wire[0].includes(SECRET))
            assert.deepStrictEqual(err.details.attempt, {
              pass: '[REDACTED]',
              ok: true,
            })
            assert.ok(!Stringify(err).includes(SECRET))
            assert.deepStrictEqual(server.leaks(), [])
            assert.deepStrictEqual(client.leaks(), [])
            client.si.close(() => server.si.close(fin))
          }),
        )
      })
    })
  })

  it('transport-client-id', function (t, fin) {
    const stub = make_web_stub()
    const server = capture({ tag: 'server' })
    const client = capture({ tag: 'client' })

    server.si
      .use(stub.web_stub)
      .add('a:1', function (msg, reply) {
        reply({ x: msg.x })
      })
      .listen({ pin: 'a:1' })

    server.si.ready(function () {
      // The client id is built from the configuration, password included.
      client.si.use(stub.web_stub).client({ pin: 'a:1', password: SECRET })

      client.si.ready(function () {
        client.si.act(
          'a:1,x:2',
          check(fin, function (err, out) {
            assert.ok(null == err)
            assert.equal(out.x, 2)
            assert.ok(
              client.lines.some((line) => line.includes('password:[REDACTED]')),
            )
            assert.deepStrictEqual(client.leaks(), [])
            client.si.close(() => server.si.close(fin))
          }),
        )
      })
    })
  })

  it('transport-error-reply', function (t, fin) {
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
                assert.deepStrictEqual(err.code, 'act_not_found')
                assert.ok(
                  err.message.includes('cmd:logn,sys:user (other keys: pass)'),
                )
                assert.ok(!Stringify(err).includes(SECRET))
                assert.deepStrictEqual(stub.wire.length, 1)
                assert.ok(!stub.wire[0].includes(SECRET))
                assert.deepStrictEqual(server.leaks(), [])
                assert.deepStrictEqual(client.leaks(), [])
                client.si.close(() => server.si.close(fin))
              }),
            )
          }),
        )
      }),
    )
  })

  it('transport-type-alias', function (t, fin) {
    Deprecate.reset()
    const stub = make_web_stub()
    const server = capture({ tag: 'server' })
    const client = capture({ tag: 'client' })

    server.si
      .use(stub.web_stub)
      .add('a:1', function (msg, reply) {
        reply({ x: msg.x })
      })
      .listen({ type: 'http', pin: 'a:1' })
      .listen({ type: 'direct', pin: 'a:2' })

    server.si.ready(
      check(fin, function () {
        client.si.use(stub.web_stub).client({ type: 'http', pin: 'a:1' })

        client.si.ready(
          check(fin, function () {
            client.si.act(
              'a:1,x:2',
              check(fin, function (err, out) {
                assert.ok(null == err)
                assert.deepStrictEqual(out.x, 2)

                // The 3.x names reach the web transport hooks.
                assert.deepStrictEqual(stub.seen, [
                  'listen:web',
                  'listen:web',
                  'client:web',
                ])

                // One deprecation report per type name, per process, on the
                // instance that used it: the server reports http and direct, and
                // the client's http was already reported.
                const reported = (lines) =>
                  lines.filter(
                    (line) =>
                      line.includes('"code":"SENECA_DEP_TRANSPORT_TYPE"') &&
                      line.includes('"level_name":"warn"'),
                  )
                // Each entry is recorded twice: by the logger and the log event.
                assert.equal(reported(server.lines).length, 4)
                assert.equal(reported(client.lines).length, 0)
                assert.ok(
                  reported(server.lines)[0].includes(
                    'The transport type http is deprecated',
                  ),
                )

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
    assert.deepStrictEqual(input.user.pass, SECRET)
    assert.deepStrictEqual(out.user, { name: 'alice', pass: '[REDACTED]' })
    assert.strictEqual(out.shared, shared)
    assert.deepStrictEqual(out.list, [{ token: '[REDACTED]' }, 'plain'])
    assert.strictEqual(out.flag, input.flag)
    assert.strictEqual(out.empty, input.empty)
    assert.strictEqual(redact(shared), shared)
    assert.deepStrictEqual(redact(null), null)
    assert.deepStrictEqual(redact('plain'), 'plain')
    assert.deepStrictEqual(redact(1), 1)

    // Secret objects are replaced whole.
    assert.deepStrictEqual(
      redact({ credentials: { user: 'u', key: SECRET } }),
      {
        credentials: '[REDACTED]',
      },
    )

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
      assert.strictEqual(redact.is_secret_key(key), true, key)
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
      assert.strictEqual(redact.is_secret_key(key), false, key)
    }
    assert.strictEqual(redact.is_secret_key(1), false)
    assert.ok(SECRET_KEYS.includes('pass'))
    assert.strictEqual(redact.is_secret_path('keys.apikey'), true)
    assert.strictEqual(redact.is_secret_path('keys.id'), false)

    // URL credentials.
    assert.deepStrictEqual(
      redact('redis://user:' + SECRET + '@host:6379/0'),
      'redis://user:[REDACTED]@host:6379/0',
    )
    assert.deepStrictEqual(
      redact('see postgres://:' + SECRET + '@db/x and more'),
      'see postgres://:[REDACTED]@db/x and more',
    )
    assert.deepStrictEqual(
      redact('mongodb://u:p@ss@host/db'),
      'mongodb://u:[REDACTED]@host/db',
    )
    assert.deepStrictEqual(
      redact('redis://:pw@host:6379?x=a@b'),
      'redis://:[REDACTED]@host:6379?x=a@b',
    )
    assert.deepStrictEqual(
      redact('https://example.com/a@b'),
      'https://example.com/a@b',
    )
    assert.deepStrictEqual(
      redact('mailto:alice@example.com'),
      'mailto:alice@example.com',
    )

    // Cycles map to the copies.
    const a = { name: 'a' }
    const b = { pass: SECRET, a }
    a.b = b
    const ca = redact(a)
    assert.notStrictEqual(ca, a)
    assert.deepStrictEqual(ca.b.pass, '[REDACTED]')
    assert.strictEqual(ca.b.a, ca)
    assert.ok(!Stringify(ca).includes(SECRET))
    assert.deepStrictEqual(a.b.pass, SECRET)

    // Cycles without secrets.
    const c = { name: 'c' }
    c.self = c
    const cc = redact(c)
    assert.strictEqual(cc.self, cc)

    // Errors keep their type, message and stack.
    const err = new Error('boom')
    err.code = 'x'
    err.details = { token: SECRET }
    const cerr = redact(err)
    assert.notStrictEqual(cerr, err)
    assert.strictEqual(cerr instanceof Error, true)
    assert.deepStrictEqual(cerr.message, 'boom')
    assert.deepStrictEqual(cerr.stack, err.stack)
    assert.deepStrictEqual(cerr.code, 'x')
    assert.deepStrictEqual(cerr.details.token, '[REDACTED]')
    assert.deepStrictEqual(err.details.token, SECRET)

    // Credentials in an error's message and stack are replaced.
    const cfail = new Error('connect failed postgres://bob:' + SECRET + '@db/x')
    const ccfail = redact({ err: cfail }).err
    assert.strictEqual(ccfail instanceof Error, true)
    assert.deepStrictEqual(
      ccfail.message,
      'connect failed postgres://bob:[REDACTED]@db/x',
    )
    assert.ok(!ccfail.stack.includes(SECRET))
    assert.ok(cfail.message.includes(SECRET))

    // An error's cause and an AggregateError's errors are walked too.
    const caused = new Error('failed', { cause: { token: SECRET } })
    const ccaused = redact({ e: caused }).e
    assert.deepStrictEqual(ccaused.cause, { token: '[REDACTED]' })
    assert.equal(
      Object.prototype.propertyIsEnumerable.call(ccaused, 'cause'),
      false,
    )
    assert.equal(caused.cause.token, SECRET)
    const many = new AggregateError([{ token: SECRET }], 'many')
    assert.deepStrictEqual(redact({ e: many }).e.errors, [
      { token: '[REDACTED]' },
    ])
    const textcause = new Error('x', { cause: 'redis://u:' + SECRET + '@h' })
    assert.equal(redact({ e: textcause }).e.cause, 'redis://u:[REDACTED]@h')
    const plaincause = new Error('x', { cause: 7 })
    assert.strictEqual(redact({ e: plaincause }).e, plaincause)

    // Class instances keep their prototype.
    class Entity {
      canon() {
        return 'sys/user'
      }
    }
    const ent = new Entity()
    ent.pass = SECRET
    const cent = redact(ent)
    assert.strictEqual(cent instanceof Entity, true)
    assert.deepStrictEqual(cent.canon(), 'sys/user')
    assert.deepStrictEqual(cent.pass, '[REDACTED]')

    // Frozen objects.
    assert.deepStrictEqual(
      redact(Object.freeze({ pass: SECRET })).pass,
      '[REDACTED]',
    )

    // Seneca instances and built-in objects are not walked.
    const si = Seneca({ log: 'silent' })
    const when = new Date()
    const map = new Map([['pass', SECRET]])
    const held = redact({ seneca: si, when, map, buf: Buffer.from('x') })
    assert.strictEqual(held.seneca, si)
    assert.strictEqual(held.when, when)
    assert.strictEqual(held.map, map)

    // Null-prototype objects.
    const bare = Object.create(null)
    bare.pass = SECRET
    const cbare = redact(bare)
    assert.deepStrictEqual(Object.getPrototypeOf(cbare), null)
    assert.deepStrictEqual(cbare.pass, '[REDACTED]')

    // A getter that throws leaves its object as it is.
    const bad = {
      pass: SECRET,
      get boom() {
        throw new Error('boom')
      },
    }
    assert.strictEqual(redact({ bad }).bad, bad)

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
    assert.strictEqual(cacc instanceof Account, true)
    assert.deepStrictEqual(cacc.token, '[REDACTED]')
    assert.deepStrictEqual(cacc.owner, 'alice')
    assert.ok(null == Object.getOwnPropertyDescriptor(cacc, 'broken'))

    // Objects whose keys cannot be listed are passed through.
    const unlisted = new Proxy(
      { pass: SECRET },
      {
        ownKeys() {
          throw new Error('no')
        },
      },
    )
    assert.strictEqual(redact({ unlisted }).unlisted === unlisted, true)

    // Objects whose type cannot be checked are passed through.
    const hostile = new Proxy(
      { pass: SECRET },
      {
        getPrototypeOf() {
          throw new Error('no')
        },
      },
    )
    assert.strictEqual(redact({ hostile }).hostile === hostile, true)

    // Very deep data is passed through.
    let deep = { pass: SECRET }
    for (let i = 0; i < 33; i++) deep = { next: deep }
    assert.strictEqual(redact(deep), deep)

    // A depth limit leaves deeper data as it is.
    const nested = { a: { pass: SECRET }, b: { c: { pass: SECRET } } }
    const limited = redact(nested, 1)
    assert.deepStrictEqual(limited.a.pass, '[REDACTED]')
    assert.strictEqual(limited.b.c, nested.b.c)

    // Inactive, custom keys and mark.
    const off = make_redactor({ active: false })
    assert.strictEqual(off(input), input)
    assert.strictEqual(off.is_secret_key('pass'), false)
    assert.strictEqual(off.matches_key('pass'), true)
    const custom = make_redactor({ keys: ['pin', ''], mark: '***' })
    assert.deepStrictEqual(custom({ pin: 1234, pass: 'x' }), {
      pin: '***',
      pass: '***',
    })

    // Command line arguments.
    assert.deepStrictEqual(
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
      [
        'node',
        'app.js',
        '--seneca.options.plugin.provider.apikey=[REDACTED]',
        '--password',
        '[REDACTED]',
        '--db=redis://u:[REDACTED]@h',
        '--port',
        '80',
        3,
      ],
    )
    assert.deepStrictEqual(off.argv(['--pass=x']), ['--pass=x'])

    si.close()
  })

  it('describe', function () {
    const si = Seneca({ log: 'silent' }).add(
      'sys:user,cmd:login,token:abc',
      function (msg, reply) {
        reply({})
      },
    )

    assert.deepStrictEqual(
      describe_msg(si, {
        sys: 'user',
        cmd: 'logn',
        email: 'a@example.com',
        pass: SECRET,
        token: SECRET,
        nested: { a: 1 },
        default$: {},
      }),
      'cmd:logn,sys:user (other keys: email, nested, pass, token)',
    )
    assert.deepStrictEqual(describe_msg(si, { foo: 1 }), '{} (other keys: foo)')
    assert.deepStrictEqual(
      describe_msg(si, { cmd: 'x'.repeat(50) }),
      'cmd:' + 'x'.repeat(44) + '...',
    )
    assert.deepStrictEqual(describe_msg(si, null), '(null)')
    assert.deepStrictEqual(describe_msg(si, [1]), '(array)')
    assert.deepStrictEqual(describe_msg(null, { a: 1 }), '{} (other keys: a)')

    // A credential URL in a pattern value is scrubbed, even with
    // redaction switched off.
    si.add('role:db,endpoint:*', function (msg, reply) {
      reply({})
    })
    const url = 'postgres://u:' + SECRET + '@h/db'
    assert.equal(
      describe_msg(si, { role: 'x', endpoint: url }),
      'endpoint:postgres://u:[REDACTED]@h/db,role:x',
    )
    const off = Seneca({ log: 'silent', redact: { active: false } })
    off.add('role:db,endpoint:*', function (msg, reply) {
      reply({})
    })
    assert.ok(!describe_msg(off, { endpoint: url }).includes(SECRET))
    off.close()

    // A property that cannot be read is named only.
    const odd = {
      get cmd() {
        throw new Error('no')
      },
    }
    assert.deepStrictEqual(describe_msg(si, odd), '{} (other keys: cmd)')
    const unlisted = new Proxy(
      {},
      {
        ownKeys() {
          throw new Error('no')
        },
      },
    )
    assert.deepStrictEqual(describe_msg(si, unlisted), '{}')

    const many = {}
    for (let i = 0; i < 30; i++) many['k' + i] = i
    assert.ok(describe_msg(si, many).endsWith(', ...)'))

    assert.deepStrictEqual(
      describe_args(si, ['sys:user,cmd:x,pass:' + SECRET, '}', () => {}, 1]),
      'cmd:x,sys:user (other keys: pass), (string), (function), (number)',
    )

    // Validation errors without Gubu records use the summary properties.
    const { shape_errors } = require('../lib/redact')
    assert.deepStrictEqual(shape_errors(null), null)
    assert.deepStrictEqual(shape_errors(new Error('x')), null)
    assert.deepStrictEqual(
      shape_errors({
        gubu: true,
        desc: () => {
          throw new Error('no')
        },
        props: [{ path: 'a', what: 'type', type: 'number', value: 1 }],
      }),
      [{ path: 'a', why: 'type', type: 'number' }],
    )
    assert.deepStrictEqual(shape_errors({ gubu: true }), null)

    assert.deepStrictEqual(
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
      'property "a" is required (string); property "b" is required; ' +
        'property "c" is not of type number; the object does not allow the ' +
        'properties "x, y"; object "d" does not allow the property "z"; ' +
        'property "e" failed a validation check (check); the value failed a ' +
        'validation check; the value failed a validation check',
    )

    assert.deepStrictEqual(
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
