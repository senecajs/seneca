/* Copyright (c) 2015 Richard Rodger, MIT License */
/* jshint node:true, asi:true, eqnull:true */
"use strict";


var util = require('util')


var _        = require('lodash')
var minimist = require('minimist')
var archy    = require('archy')


module.exports = function( seneca, argv ) {
  return minimist(process.argv.slice(2))
}

/** Handle command line specific functionality */
module.exports.handle = function( seneca, argv ) {
  if( argv.seneca ) {
    var cmdspec = argv.seneca
    if( cmdspec.print ) {
      if( !!cmdspec.print.tree ) {

        // Hack! Complex init means non-deterministic or multiple ready calls,
        // so just delay tree print by some number of seconds to capture full tree.
        var delay_seconds = cmdspec.print.tree.all || cmdspec.print.tree
        if( _.isNumber( delay_seconds ) ) {
          setTimeout(function(){
            print_tree( seneca, cmdspec )
          }, 1000*delay_seconds )
        }

        // Print after first ready
        else {
          seneca.ready(function(){
            print_tree( this, cmdspec )
          })
        }
      }
      
      if( !!cmdspec.print.options ) {
        seneca.options( { debug: { print: { options:true } } } )
      }
    }
  }
}



function print_tree( seneca, cmdspec ) {
  var tree = {label:'Seneca action patterns for instance: '+seneca.id, nodes:[]}

  function insert(nodes,current) {
    if( 0 === nodes.length ) return;

    for( var i = 0; i < current.nodes.length; i++ ) {
      if( nodes[0] === current.nodes[i].label ) {
        return insert( nodes.slice(1), current.nodes[i] )
      }
    }

    var nn = {label:nodes[0],nodes:[]}
    current.nodes.push(nn)
    insert(nodes.slice(1),nn)
  }

  _.each(seneca.list(),function(pat){
    var nodes = [], ignore = false
    _.each(pat,function(v,k){
      if( !cmdspec.print.tree.all &&
          ( k==='role' &&
            ( v==='seneca' ||
              v==='basic' ||
              v==='util' ||
              v==='entity' ||
              v==='web' ||
              v==='transport' ||
              v==='options' ||
              v==='mem-store' ||
              v==='seneca'
            )) ||
          k==='init'
        )
      {
        ignore = true
      }
      else {
        nodes.push(k+':'+v)
      }
    })

    if( !ignore ) {
      var meta = seneca.find(pat)

      var metadesc = []
      while( meta ) {
        metadesc.push( '# '+(meta.plugin_fullname||'-')+
                       ', '+meta.id+', '+meta.func.name )
        meta = meta.priormeta
      }

      nodes.push((metadesc.join('\n')))

      insert(nodes,tree)
    }
  })

  console.log( archy(tree) )
}
