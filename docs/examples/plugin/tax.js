// Tutorial: Writing a plugin. The finished plugin.
function tax(options) {
  const seneca = this

  // Mutable copy of the configured rates; may be extended by options.load
  const rates = { ...options.rates }

  seneca.add('role:tax,cmd:rate', function (msg, reply) {
    const rate = rates[msg.country]
    if (null == rate) {
      // Plugin specific error code, defined in tax.errors below
      return reply(seneca.error('unknown_country', { country: msg.country }))
    }
    reply({ country: msg.country, rate })
  })

  seneca.message('role:tax,cmd:total', async function (msg) {
    const { rate } = await this.post('role:tax,cmd:rate', { country: msg.country })
    const total = msg.net * (1 + rate)
    return { net: msg.net, country: msg.country, total: round(total, options.precision) }
  })

  // Asynchronous initialization: runs before the plugin is considered loaded
  seneca.prepare(async function () {
    if (options.load) {
      Object.assign(rates, await options.load())
    }
  })

  return {
    exports: { rates },
  }
}

// Default options, also the validation shape (Gubu).
tax.defaults = ({ valid }) => ({
  rates: valid.Open({ EU: 0.2 }),
  precision: 2,
  load: valid.Skip(Function),
})

// Error message templates for this plugin's error codes.
tax.errors = {
  unknown_country: 'No tax rate is known for country <%=country%>.',
}

function round(value, precision) {
  const factor = Math.pow(10, precision)
  return Math.round(value * factor) / factor
}

module.exports = tax
