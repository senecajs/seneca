

$(function(){
  
  var m = null;
  if( m = /ent\/([^\/]+)\/([^\/]+)$/.exec(window.location.href) ) {
    ent( m[1], m[2] )
  }
  else {
    main()
  }
})


function main() {
  $.getJSON('api/ents',function(data){
    console.log(data)

    var ents = data.ents

    var entlist = $('#ents')
    for( var i = 0; i < ents.length; i++ ) {
      var ent = ents[i]
      entlist.append('<li><a href="ent/'+ent.base+'/'+ent.name+'">'+ent.base+'_'+ent.name+'</a></li>')
    }
  })
}


function ent(base,name) {
  $('h1').text(base+'_'+name)
}