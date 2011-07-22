/** https://github.com/csnover/js-iso8601 */(function(n,f){var u=n.parse,c=[1,4,5,6,7,10,11];n.parse=function(t){var i,o,a=0;if(o=/^(\d{4}|[+\-]\d{6})(?:-(\d{2})(?:-(\d{2}))?)?(?:T(\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{3}))?)?(?:(Z)|([+\-])(\d{2})(?::(\d{2}))?)?)?$/.exec(t)){for(var v=0,r;r=c[v];++v)o[r]=+o[r]||0;o[2]=(+o[2]||1)-1,o[3]=+o[3]||1,o[8]!=="Z"&&o[9]!==f&&(a=o[10]*60+o[11],o[9]==="+"&&(a=0-a)),i=n.UTC(o[1],o[2],o[3],o[4],o[5]+a,o[6],o[7])}else i=u?u(t):NaN;return i}})(Date)


var app = null


function entkey(base,name) {
  if( base.base ) {
    name = base.name
    base = base.base
  } 
  return base+'_'+name
}


var fieldtype = {}

function stringify_field( obj, field, ent ) {
  var txt = null

  if( null === obj || undefined === obj ) {
    txt = ''
  }
  else {
    var type = ent.fieldtypes[field] && ent.fieldtypes[field].type
    if( type ) {
      var stringer = {
        'date': function(obj){ return (obj.toISOString && obj.toISOString()) || '' }
      }
      txt = (stringer[type] && stringer[type](obj)) || null
    }

    if( null === txt ) {
      if( 'object' == typeof(obj) ) {
        txt = JSON.stringify(obj)
      }
      else {
        txt = ''+obj
      }
    }
  }

  console.log('stringify',obj,txt,type)
  return txt
}

function parse_field( txt, field, ent ) {
  var obj = txt

  var type = ent.fieldtypes[field] && ent.fieldtypes[field].type
  if( type ) {
    var stringer = {
      'date':    function(obj){ return ''==txt?null:new Date(Date.parse(txt)) },
      'number':  function(obj){ return parseFloat(txt,10) },
      'integer': function(obj){ return parseInt(txt,10) },
      'decimal': function(obj){ return parseFloat(txt,10) },
      'boolean': function(obj){ return 'true'==txt },
      'string':  function(obj){ return txt },
      'object':  function(obj){ return ''==txt?null:JSON.parse(txt) },
      'array':   function(obj){ return ''==txt?null:JSON.parse(txt) },
    }

    if(stringer[type]) {
      obj = stringer[type](txt)
    }
    else {
      obj = null
    }
  }

  //if( null === obj || undefined === obj ) {
  //  obj = ''+txt
  //}

  console.log('parse',txt,obj,type)
  return obj
}



$(function(){
  app = new App()
  app.init()
 
})


function App() {
  var self = this

  self.entities = {}

  self.init = function() {
    self.view = new View(app)

    self.load_opts(function(opts){
      self.load_ents(function(ents){
        self.view.list_ents(ents)
      })
    })
  }


  self.load_opts =function(cb) {
    if( self.opts ) {
      cb(opts)
    }
    else {
      $.getJSON('api/opts',function(data){
        console.log(data)

        self.opts = data
        cb(app.opts)
      })
    }
  }

  self.load_ents = function(cb) {
    if( self.ents ) {
      cb(ents)
    }
    else {
      $.getJSON('api/ents',function(data){
        console.log(data)
        self.ents = data.ents
        cb(data.ents)
      })
    }
  }

  self.get_entity = function(ent) {
    var ek = entkey(ent)
    var entity = self.entities[ek] || (self.entities[ek] = new Entity(self,ent))
    return entity
  }
  
}


function View(app) {
  var self = this

  self.el = {
    ents: {
      list: $('#ents_list'),
      item_tm: $('#ents_item_tm').clone()
    },
    items: {
      table: $('#item')
    },
    edit: {
      panel: $('#edit_panel'),
      item_tm: $('#edit_item_tm').clone(),
      save: $('#edit_save')
    }
  }



  function show(el) {
    return el.removeClass('hide')
  }

  function hide(el) {
    return el.addClass('hide')
  }

  self.list_ents = function(ents) {
    self.el.ents.list.empty()
    for( var i = 0; i < ents.length; i++ ) {
      var ent = ents[i]
      var item = show(self.el.ents.item_tm.clone())
      item.text( entkey(ent.base,ent.name) )
      item.click(function(ent){
        return function(){
          item.fadeOut()
          self.table_ent(ent,function(){
            item.fadeIn()
          })
        }
      }(ent))
      self.el.ents.list.append(item)
    }
  }

  self.table_ent = function(ent,cb) {
    var entity = app.get_entity(ent)

    entity.list(function(items){
      self.el.items.table.empty()

      var head = $('<tr>')
      for( var hI = 0; hI < ent.fields.length; hI++ ) {
        head.append( $('<th>').text(ent.fields[hI]) )
      }
      self.el.items.table.append(head)

      for( var i = 0; i < items.length; i++ ) {
        var item = items[i]
        var row = $('<tr>')

        console.log(item)

        for( var fI = 0; fI < ent.fields.length; fI++ ) {
          console.log(ent.fields[fI],item[ent.fields[fI]])

          var txt = item[ent.fields[fI]]

          txt = stringify_field(txt,ent.fields[fI],ent)
          txt = undefined === txt ? '' : txt

          row.append( $('<td>').text( txt ) )
        }

        self.el.items.table.append(row)
        
        row.click(function(entity,item,row){
          return function(){
            self.el.items.table.find('tr').removeClass('high')
            row.addClass('high')
            self.edit_item( entity,item,row )
          }
        }(entity,item,row))
      }

      cb()
    })
  }

  
  self.edit_item = function( entity,item,row ) {
    self.el.edit.panel.empty()

    entity.get(item.id,true,function(item){
      var ent = entity.ent

      for( var fI = 0; fI < ent.fields.length; fI++ ) {
        var f = ent.fields[fI]
        var input = show(self.el.edit.item_tm.clone())
        input.find('label').text(f)
        var ta = input.find('textarea')
        console.log(ta)

        var txt = stringify_field(item[f],f,ent) 
        txt = undefined === txt ? '' : txt
        ta.val( txt )
        ta.attr('id','field_'+f)
        self.el.edit.panel.append(input)
      }

      self.el.edit.save.unbind('click').click(function(){
        self.save_item(entity,item,row)
      })
      
      show(self.el.edit.save.css({opacity:1}))
    })
  }

  
  self.save_item = function( entity, item, row ) {
    //var upitem = {id:item.id}
    
    var ent = entity.ent
    
    for( var fI = 0; fI < ent.fields.length; fI++ ) {
      var f = ent.fields[fI]
      var input = $('#field_'+f)
      console.log(input.text(),input.val())
      //upitem[f] = parse_field( input.val(), f, ent )
      item[f] = parse_field( input.val(), f, ent )
    }

    console.log('up',item)
    

    self.el.edit.save.fadeOut()
    //entity.save(upitem,function(res){
    entity.save(item,function(res){
      self.el.edit.save.fadeIn()
      if( res.ok ) {
        var cells = row.find('td')
        for( var fI = 0; fI < ent.fields.length; fI++ ) {
          var f = ent.fields[fI]
          
          //var txt = stringify_field(upitem[f],f,ent) 
          var txt = stringify_field(item[f],f,ent) 
          txt = undefined === txt ? '' : txt

          //console.log('uptable',f,cells[fI],upitem[f],txt)
          console.log('uptable',f,cells[fI],item[f],txt)
          $(cells[fI]).text( txt )
        }
      }
      // FIX: else err msg
    })
  }

}


function Entity(app,ent) {
  var self = this

  self.ent = ent

  self.map = {}
  self.items = []


  self.list = function(cached,cb) {
    cb = 'boolean' == typeof(cached) ? cb : cached

    if( cached && 0 < self.items ) {
      cb(self.items) 
    }
    else {
      $.getJSON( app.opts.restprefix+'/'+ent.base+'/'+ent.name, function(data){    
        self.items = data.list

        for( var i = 0; i < self.items.length; i++ ) {
          self.map[self.items[i].id] = {i:i,d:self.items[i]}
        }

        cb(self.items)
      })
    }
  }
      

  self.get = function(id,cached,cb) {
    cb = 'boolean' == typeof(cached) ? cb : cached

    console.log( 'get', !!(cached && self.map[id]), self.map[id] )

    if( cached && self.map[id] ) {
      cb( self.map[id].d )
    }
    else {
      $.getJSON( app.opts.restprefix+'/'+ent.base+'/'+ent.name+'/'+id, function(item){    
        var i = self.items.length
        if( self.map[id] ) {
          i = self.map[id].i
        }

        self.map[id] = {i:i,d:item}
        self.items[i] = item

        cb(item)
      })
    }
  }


  self.save = function(item,cb) {
    $.ajax({
      url:app.opts.restprefix+'/'+ent.base+'/'+ent.name+'/'+item.id,
      type:'POST',
      dataType:'json',
      contentType:'application/json',
      data:JSON.stringify(item),
      success:function(data){
        cb(data)
      },
      error:function(){
        console.log(Array.prototype.slice.call(arguments))
      }
    })
  }
}

