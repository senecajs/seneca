const Summary = require('summary')
const Seneca = require('../seneca')

const TOTAL = process.argv[2] || 1000
const TIMEOUT = 9999

const s0 = Seneca({
  legacy:false,tag:'s0',close_delay:0,death_delay:0,timeout:TIMEOUT,
  log:{logger:'flat',level:'warn'},
})
      .add('a:1', {x:Number,y:{z:Boolean}}, function(msg, reply) {
        reply({x:1+msg.x})
      })
      .listen(40404)

const c0 = Seneca({
  legacy:false,tag:'c0',close_delay:0,death_delay:0,timeout:TIMEOUT,
  log:{logger:'flat',level:'warn'},
})
      .client(40404)


s0.ready(function(){
  c0.ready(function() {

    let top = {
      started:0,
      finished:0,
      pass: 0,
      fail: 0,
      dur: [],
    }
    
    function report(duration) {
      console.log('basic', TOTAL)
      c0.close(()=>{
        console.log('close', 'c0')
        s0.close(()=>{
          console.log('close', 's0')
          console.log('top', {
            duration: duration,
            started:top.started,
            finished:top.finished,
            pass:top.pass,fail:top.fail,durlen:top.dur.length
          })
          let summary = Summary(top.dur)
          console.log('mode:',summary.mode())
          console.log('mean:',summary.mean())
          console.log('median:',summary.median())
          console.log('quartile 25:',summary.quartile(0.25))
          console.log('quartile 50:',summary.quartile(0.5))
          console.log('quartile 75:',summary.quartile(0.75))
          console.log('quartile 90:',summary.quartile(0.90))
          console.log('quartile 95:',summary.quartile(0.95))
          console.log('quartile 99:',summary.quartile(0.99))
          console.log('variance:',summary.variance())
          console.log('sd:',summary.sd())
          console.log('max:',summary.max())
          console.log('min:',summary.min())
          console.log('s0',s0.stats())
          console.log('c0',c0.stats())
        })
      })
    }

    let begin = Date.now()
    while(top.started < TOTAL) {
      top.started++
      setTimeout(()=>{
        let start = Date.now()
        c0.act('a:1',{x:11,y:{z:true}}, function(err, out) {
          top.finished++
          if(out && 12 === out.x) {
            top.pass++
          }
          else {
            top.fail++
          }

          let end = Date.now()
          top.dur.push(end-start)
          
          if(TOTAL <= top.finished) {
            report(end-begin)
          }
        })
      },TIMEOUT*Math.random())
    }

  })
})
