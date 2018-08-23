// node panic.js
// node panic.js --seneca.test
// node panic.js --seneca.options.debug.undead=true
// node panic.js --seneca.test --seneca.options.debug.undead=true

var panic = new Error('panic')
panic.code = {toString:function(){throw new Error('gotcha!')}}
require('../../..')().die(panic)
