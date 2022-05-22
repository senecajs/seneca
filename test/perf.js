const Summary = require('summary')
const Seneca = require('../seneca')

const TOTAL = process.argv[2] || 1000
const TIMEOUT = 9999
const LEGACY = true
const VALIDATE = true
const HISTORY = false
const SILENT = true

const s0 = Seneca({
  legacy:LEGACY,tag:'s0',close_delay:0,death_delay:0,timeout:TIMEOUT,
  log:SILENT?'silent':{logger:'flat',level:'warn'},
  history: {active:HISTORY},
  valid: {active:VALIDATE},
})
      // .test()
      .add('a:1',
           {x:Number,y:{z:Boolean}},
           function(msg, reply) {
             reply({x:1+msg.x})
           })
      .listen(40404)

const c0 = Seneca({
  legacy:LEGACY,tag:'c0',close_delay:0,death_delay:0,timeout:TIMEOUT,
  log:SILENT?'silent':{logger:'flat',level:'warn'},
  history: {active:HISTORY},
  valid: {active:VALIDATE},
})
      // .test()
      .client(40404)


s0.ready(function(){
  c0.ready(function() {

    let top = {
      started:0,
      finished:0,
      pass: 0,
      fail: 0,
      passdur: [],
      faildur: [],
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
            pass:top.pass,fail:top.fail,
            passdurlen:top.passdur.length,
            faildurlen:top.faildur.length
          })

          let summary = Summary(top.passdur)
          console.log('pass mode:',summary.mode())
          console.log('pass mean:',summary.mean())
          console.log('pass median:',summary.median())
          console.log('pass quartile 25:',summary.quartile(0.25))
          console.log('pass quartile 50:',summary.quartile(0.5))
          console.log('pass quartile 75:',summary.quartile(0.75))
          console.log('pass quartile 90:',summary.quartile(0.90))
          console.log('pass quartile 95:',summary.quartile(0.95))
          console.log('pass quartile 99:',summary.quartile(0.99))
          console.log('pass variance:',summary.variance())
          console.log('pass sd:',summary.sd())
          console.log('pass max:',summary.max())
          console.log('pass min:',summary.min())

          let failsummary = Summary(top.faildur)
          console.log('fail mean:',failsummary.mean())
          
          console.log('s0',s0.stats())
          console.log('c0',c0.stats())
        })
      })
    }

    let begin = Date.now()
    function run() {
      if(top.started < TOTAL) {
      top.started++

        let start = Date.now()
        c0.act('a:1',{x:11,y:{z:true}}, function(err, out) {
          let end = Date.now()
          
          top.finished++
          if(0 === top.finished%5000) {
            console.log(top.finished+'...')
          }

          if(out && 12 === out.x) {
            top.pass++
            top.passdur.push(end-start)
          }
          else {
            top.fail++
            top.faildur.push(end-start)
          }
          
          if(TOTAL <= top.finished) {
            report(end-begin)
          }
        })

        setImmediate(run)
      }
    }

    run()
  })
})
