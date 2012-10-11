
var seneca = require('../../lib/seneca');

var si = seneca({})


si.use('echo',{inject:{bar:2}})
si.use('transport')



var express = require('express');

var app = express();

app.use(express.bodyParser());

app.use( si.service() );

app.listen(10171)

