
var connect = require('connect')

var seneca = require('../..')


var si = seneca()
si.use('echo',{inject:{bar:2}})
si.use('transport')


var app = connect()
app.use(connect.json())
app.use( si.service() )
app.listen(10171)

