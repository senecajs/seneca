'use strict'

var Seneca = require('..')

function logger (s,d) {
  console.log(d.kind,d.case,d.actid,d.pattern,
              Seneca.util.clean('OUT'==d.case?d.result:d.msg))
}

var seneca = Seneca(
  {
    //internal:{logger:logger},
    //legacy:{logging:false}
  }
)
  .add('a:1',function(m,d){d(null,{x:1})})
  .act('a:1',console.log)
