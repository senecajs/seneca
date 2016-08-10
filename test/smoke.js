/* Copyright (c) 2016 Richard Rodger, MIT License */
'use strict'

require('..')()

  .add('a:1', function (msg, done) {
    done(null, {x: 1})
  })
  .act('a:1', console.log)

  .use(function foo () {
    this.add('b:1', function (msg, done) {
      done(null, {y: 1})
    })
  })
  .act('b:1', console.log)

  .ready(function () {
    console.log('ready')

    this
      .add('c:1', function (msg, done) {
        done(null, {z: 1})
      })
      .act('c:1', console.log)

      .close()
  })

