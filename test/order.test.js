/* Copyright © 2020 Richard Rodger and other contributors, MIT License. */
'use strict'

const Code = require('@hapi/code')
const Lab = require('@hapi/lab')

var lab = (exports.lab = Lab.script())
var describe = lab.describe
var expect = Code.expect
var it = lab.it

var Seneca = require('..')

describe('order', function () {
  it('happy', async ()=>{
    var s0 = Seneca({xdebug:{undead:true}}).test()

    /*
    s0.order.plugin.addListener('xtask-end', function(ev) {
      console.log(
        ev.result.log.task.name
      )
    })
    */
    
    s0.order.plugin.add({
      name: 'before-options',
      exec: function(spec) {
        return {
          op: 'merge',
          out: {
            plugin: {
              options: {
                c: 3
              }
            }
          }
        }
      },
      before: 'options'
    })

    // TODO: fix ordu so this works - need to add before next
    s0.order.plugin.add({
      name: 'after-options',
      exec: function(spec) {
        var opts = spec.data.plugin.options
        return {
          op: 'merge',
          out: {
            plugin: {
              options: {
                d: opts.a+opts.c
              }
            }
          }
        }
      },
      after: 'options'
    })

    
    expect(s0.order.plugin.tasks().map(t=>t.name)).equal([
        'args',
        'load',
        'normalize',
        'preload',
        'pre_meta',
        'pre_legacy_extend',
        'delegate',
        'call_define',
        'before-options',
        'options',
        'after-options',
        'define',
        'post_meta',
      'post_legacy_extend',
      'call_prepare',
        'complete'
    ])

    
    var p0 = function p0(options) {
      //console.log('p0 OPTS', options)
      return {
        exports: {
          opts: options
        }
      }
    }

    p0.defaults = {
      a: 1
    }
    
    s0.use(p0,{b:2})
    
    return new Promise((r,j)=>{
      s0.error(j)
      s0.ready(function() {
        expect(s0.export('p0/opts')).equals({ b: 2, a: 1, c: 3, d: 4 })


        var p1 = function p1() {}
        p1.preload = function() {
          return {
            order: {
              plugin: [
                {
                  name: 'more-before-options',
                  before: 'options',
                  exec: ()=>{
                    return {
                      op: 'merge',
                      out: {
                        plugin: {
                          options: {
                            f: 5
                          }
                        }
                      }
                    }
                  }
                }
              ]
            }
          }
        }
        
        s0.use(p1)

        var Joi = s0.util.Joi


        // console.log('TASKLIST',s0.order.plugin.tasks().map(t=>t.name).join('\n'))
        
        s0.use({
          name: 'p2',
          define: function(options) {
            return {
              exports: {
                opts: options
              }
            }
          },
          

          defaults: Joi.object({
            e: Joi.string().default('v0'),
            c: Joi.number(),
            f: Joi.number()
          }).default()
        })


        s0.ready(function() {
          //console.log('AAA', s0.export('p2/opts'))
          expect(s0.export('p2/opts')).equals({
            c: 3, e: 'v0', d: NaN, f:5
          })
          r()
        })
      })
    })
  })


})
