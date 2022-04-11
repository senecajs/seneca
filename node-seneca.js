/* Copyright © 2010-2022 Richard Rodger and other contributors, MIT License. */
'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
exports.Seneca = void 0;
// Node API modules.
const Events = require('events');
const Util = require('util');
const seneca_1 = require("./seneca");
// Seneca is an EventEmitter.
function makeNodeSeneca(seneca_options, more_options) {
    const instance = (0, seneca_1.makeSeneca)(seneca_options, more_options);
    instance[Util.inspect.custom] = instance.toJSON;
    // FIX: does not work? events for browser?
    Events.EventEmitter.call(instance);
    instance.setMaxListeners && instance.setMaxListeners(0);
    instance.private$.Util = Util;
    return instance;
}
Object.assign(makeNodeSeneca, seneca_1.makeSeneca);
const Seneca = makeNodeSeneca;
exports.Seneca = Seneca;
if ('undefined' != typeof (module)) {
    module.exports = exports.Seneca;
}
//# sourceMappingURL=node-seneca.js.map