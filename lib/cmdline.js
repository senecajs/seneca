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
      if( cmdspec.print.tree ) {
        seneca.ready(function(){
          var tree = {label:'Patterns',nodes:[]}

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

          _.each(this.list(),function(pat){
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
              var meta = seneca.findact(pat)

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
        })
      }
    }
  }
}
