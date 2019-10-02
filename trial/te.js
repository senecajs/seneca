
/*
process.on('uncaughtException', function() {
  console.log('UUU', arguments)
})
*/

try {
setImmediate(bbb,10)
} catch(e) {
  console.log('QQQ', e)
}
  
function bbb() {
  try {
    aaa()
  }
  catch(e) {
    console.log('FFF', e)
  }
}

function aaa() {
  throw new Error('bbb')                    
}
