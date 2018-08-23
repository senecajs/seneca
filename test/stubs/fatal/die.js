// node die.js
// node die.js --seneca.test
// node die.js --seneca.options.debug.undead=true
// node die.js --seneca.test --seneca.options.debug.undead=true
require('../../..')().die(new Error('death'))
