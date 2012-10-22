
function log() {
  console.log(arguments)
}

function printjson() { 
  var arg = arguments[0] || arguments[1]
  console.log(JSON.stringify( arg )) 
}

var http = {
  req: function(method,url,data,win,fail) {
    $.ajax({
      url:         url,
      type:        method,

      contentType: data ? 'application/json' : undefined,
      data:        data ? JSON.stringify(data) : undefined,
      dataType:    'json',
      cache:       false,

      success:     win || log,
      error:       fail || win || log
    })
  },


  post: function(url,data,win,fail) {
    http.req('POST',url,data,win,fail)
  },

  put: function(url,data,win,fail) {
    http.req('PUT',url,data,win,fail)
  },

  get: function(url,win,fail) {
    http.req('GET',url,null,win,fail)
  },

  del: function(url,win,fail) {
    http.req('DELETE',url,null,win,fail)
  }
}
