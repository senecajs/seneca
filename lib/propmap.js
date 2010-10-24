/* Copyright (c) 2010 Ricebridge */

var common  = require('./common');
var E = common.E;

var sys     = common.sys;
var eyes    = common.eyes;
var assert  = common.assert;

function PropMap() {
  var self = this;

  self.root = {root:true,prop:'root',subs:{}};

  self.find = function( propset ) {
    fixpropset(propset);
    return nodefind(self.root,propset);
  }
  
  self.add = function( propset, ref ) {
    fixpropset(propset);
    nodeadd(self.root,propset,ref);
  }

  self.inspect = function() {
    return nodeinspect(self.root);
  }

  self.toString = function() {
    return 'PropMap:'+nodeinspect(self.root,'');
  }


  var fixpropset = function( propset ) {
    if( !propset.$get ) {
      propset.$get = function(prop) {
        var res = propset[prop];
        res = res ? res : null;
        return res;
      }
    }
  }


  var nodeadd = function(node,propset,ref) {
    var props = [];
    for( p in propset ) {
      if( propset.hasOwnProperty(p) && 'function'!=typeof(propset[p]) ) {
        props.push(p);
      }
    }

    props.sort();

    var cn = node, nn, sn, refset = false;

    for( var pI = 0; pI < props.length; ) {
      var cp = props[pI];
      var cv = propset.$get(cp);
      var np = pI < props.length-1 ? props[pI+1] : null;

      // if ref node, move ref to star path, and convert to prop node
      if( cn.ref ) {
        cn.star = {ref:cn.ref,subs:{}};
        delete cn.ref;
        cn.prop = cp;
      }

      var compare = cn.root ? 1 : cp < cn.prop ? -1 : cp > cn.prop ? 1 : 0;

      // same prop, add a new sub value
      if( 0 == compare ) {
        if( !cn.subs[cv] ) {
          if( null == np ) {
            nn = {ref:ref,subs:{}};
            refset = true;
          }
          else {
            nn = {prop:np,subs:{}};
          }
        }
        else {
          nn = cn.subs[cv];
          if( null == np && nn.ref ) {
            nn = {ref:ref,subs:{}};
            refset = true;
          }
        }

        cn.subs[cv] = nn;
        pI++;
      }

      // cp is lex. after cn.prop, it will occur further down the star path
      else if( 1 == compare ) {
        if( !cn.star ) {
          cn.star = {prop:cp,subs:{}};
        }
        nn = cn.star;
      }

      // cp is lex. before cn.prop, so place copy of cn below cp
      else if( -1 = compare ) {
        cn.star = {prop:cn.prop,star:cn.star,subs:cn.subs};
        cn.prop = cp;
        cn.subs = {};
      }
      
      cn = nn;
    }


    // used up all props, but ref is still not set, so place at end of star path
    if( !refset ) {
      while( cn.star ) {
        nn = cn.star;
        if( nn.ref ) {
          break;
        }
        cn = nn;
      }

      cn.star = {ref:ref};;
    }
  }


  var nodefind = function(node,propset) {
    var ref = null;
    if( node.ref ) {
      ref = node.ref;
      self.trace && self.trace.push(' ref:'+ref);
    }
    else {
      var val = propset.$get(node.prop);
      self.trace && node.prop && self.trace.push(' '+node.prop+'->'+val);

      var subnode = val && node.subs && node.subs[val];

      if( subnode ) {
        ref = nodefind(subnode,propset);
      }

      if( !ref && node.star) {
        self.trace && self.trace.push(' *');
        ref = nodefind(node.star,propset);
      }
    }
    return ref;
  }


  var nodeinspect = function(node,indent) {
    var pn = node.prop;
    var sb = [pn,':\n'];

    var vals = [];
    for( var v in node.subs ) {
      vals.push(v);
    }
    vals.sort();

    var subindent = indent+'  ';
    for( var vI = 0; vI < vals.length; vI++ ) {
      var v = vals[vI];
      sb.push(subindent);
      sb.push(v);
      sb.push(' -> ');
      sb.push( nodeinspect(node.subs[v],subindent) );
      sb.push('\n');
    }

    if( node.star ) {
      sb.push(subindent);
      sb.push('* -> ');
      sb.push( nodeinspect(node.star,subindent) );
    }

    if( node.ref ) {
      sb.push(subindent);
      sb.push((''+node.ref).replace(/\n+/g, ' '));
    }

    return sb.join('');
  }
}


exports.PropMap = PropMap;