
var common = require('../common')

var _ = common._



function Store() {
  var self = {}

  var allcmds = ['save','load','list','remove','close']


  /* opts.map = { canon: [acts] }
   * 
   */
  self.init = function(si,opts,cb) {
    // TODO: parambulator validation

    var entspecs = []

    if( opts.map ) {
      for( var canon in opts.map ) {
        var cmds = opts.map[canon]
        if( '*' == cmds ) {
          cmds = allcmds
        }
        entspecs.push({canon:canon,cmds:cmds})
      }
    }
    else {
      entspecs.push({canon:'//',cmds:allcmds})
    }
    
    for( var esI = 0; esI < entspecs.length; esI++ ) {
      var entspec = entspecs[esI]

      var m = /^(\w*)\/(\w*)\/(\w*)$/.exec(entspec.canon)
      var name = m[3], base = m[2], tenant = m[1]

      // TODO: support base/name and name

      var entargs = {}
      name   && (entargs.name   = name)
      base   && (entargs.base   = base)
      tenant && (entargs.tenant = tenant)

      for( var cI = 0; cI < entspec.cmds.length; cI++ ) {
        var cmd = entspec.cmds[cI]
        var args = _.extend({on:'entity',cmd:cmd},entargs)
        si.add( args ,self[cmd+'$'])
      }
    }

    cb()
  }


  self.parent = function() {
    return {
      init:self.init
    }
  }

  return self
}


exports.Store = Store

