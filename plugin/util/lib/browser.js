
function printjson() { 
  var arg = arguments[0] || arguments[1]
  console.log(JSON.stringify( arg )) 
}

var http = {
  req: function(method,url,data,cb) {
    cb = cb || printjson
    $.ajax({
      url:         url,
      type:        method,

      contentType: data ? 'application/json' : undefined,
      data:        data ? JSON.stringify(data) : undefined,
      dataType:    'json',
      cache:       false,

      success:     function(out){cb(null,out)},
      error:       function(out){cb(out)}
    })
  },


  post: function(url,data,cb) {
    http.req('POST',url,data,cb)
  },

  put: function(url,data,cb) {
    http.req('PUT',url,data,cb)
  },

  get: function(url,cb) {
    http.req('GET',url,null,cb)
  },

  del: function(url,cb) {
    http.req('DELETE',url,null,cb)
  }
}
