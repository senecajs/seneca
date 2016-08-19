'use strict'

function xy (tag) {
  return function xy (args, done) {
    args.y = '' + args.x + '-' + tag
    done(null, this.util.clean(args))
  }
}

function p0 () {
  this.add('a:1', xy('a'))
  this.add('a:1,b:2', xy('ab'))
  this.add('a:1,b:2,c:3', xy('abc'))
  this.add('d:4', xy('d'))
  this.add('d:4,e:5', xy('de'))
  this.add('f:6', xy('f'))
}

require('../')
  .use(p0)
  .add('d:4,e:5', xy('de2'))
  .act('a:1,x:A', console.log)
