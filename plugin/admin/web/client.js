
var app = {
  
  conf: {
    maxlines: 9999
  },

  itemcount: 0,

  init: function() {
    app.loglist = $('#loglist')

    var confurl = (/^(.*?)(\/)?(index\.html)?$/.exec(''+location.href))[1]+'/conf'
    console.log(confurl)

    $.get( confurl, function(data) {
      app.conf = data
      console.log(app.conf)
      app.initsock()
    })

    $('#update').click(sendlogroute)
  },

  initsock: function() {
    app.sock = new SockJS(app.conf.prefix+'/socket');

    app.sock.onopen = function() {
      app.sock.send( JSON.stringify({hello:true,token:app.conf.login}) )
    }

    app.sock.onmessage = function(e) {
      console.log(e)
      var msg = JSON.parse(e.data)
      if( msg.hello ) {
        sendlogroute()
      }
      else {
        var itemdiv = $('<div>').addClass('item').addClass(++app.itemcount%2?'rowA':'rowB')

        var logstr = []
        _.each(msg,function(val){
          var valstr = _.isObject(val)?JSON.stringify(val):val
          logstr.push(valstr)
        })
        itemdiv.text(logstr.join('\t'))

        app.loglist.prepend(itemdiv)
        var numitems = app.loglist.children().length
        if( app.conf.maxlines < numitems ) {
          app.loglist.remove(app.loglist.children()[numitems-1])
        }
      }
    }
  }

}



function sendlogroute() {

  var newroute = {
    level:  $('#level_in').val(),
    type:   $('#type_in').val(),
    plugin: $('#plugin_in').val(),
    tag:    $('#tag_in').val(),
  }

  _.each(newroute,function(val,key){
    if( ''==val ) newroute[key]=undefined;
  })

  console.log(newroute)

  var msg = {token:app.conf.login,oldroute:app.logroute,newroute:newroute}
  app.sock.send( JSON.stringify(msg) )
  app.logroute = newroute
}


$(app.init)
