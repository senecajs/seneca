
var app = {

}

$(function(){
  var loglist = $('#loglist')

  app.sock = new SockJS('/admin/socket');

  app.sock.onopen = function() {
    sendlogroute()
  }

  app.sock.onmessage = function(e) {
    loglist.prepend($('<li>').text(e.data))
  }


  $('#update').click(sendlogroute)
})


function sendlogroute() {

  var newroute = {
    level: $('#level_in').val(),
    type:  $('#type_in').val(),
  }

  var msg = {oldroute:app.logroute,newroute:newroute}
  app.sock.send( JSON.stringify(msg) )
  app.logroute = newroute
}