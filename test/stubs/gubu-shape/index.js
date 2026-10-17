/* Copyright (c) 2026 Richard Rodger and other contributors, MIT License */
'use strict'

// Test-only stand-in for gubu: shape under gubu's export names.
// Remove with the package.json overrides once seneca-entity and
// seneca-mem-store depend on shape.

const shape = require('shape')

module.exports = { ...shape, Gubu: shape.Shape }
