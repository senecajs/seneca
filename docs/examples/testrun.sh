echo 'PASS IF NO DIFF'

echo 'START' > testrun.log

echo sales-tax >> testrun.log
node sales-tax.js --seneca.log.quiet >> testrun.log

echo sales-tax-config >> testrun.log
node sales-tax-config.js --seneca.log.quiet >> testrun.log

echo sales-tax-client/server >> testrun.log
node config-server.js --seneca.log.quiet >> testrun.log &
CONFIG_SERVER_PID=$!
sleep 1
node sales-tax-client.js --seneca.log.quiet >> testrun.log
kill $CONFIG_SERVER_PID

echo sales-tax-complex >> testrun.log
node sales-tax-complex.js --seneca.log.quiet >> testrun.log

echo sales-tax-plugin/app >> testrun.log
node sales-tax-app.js --seneca.log=plugin:shop > testrun.server.tmp &
APP_SERVER_PID=$!
sleep 1
curl -s "http://localhost:3000/shop/salestax?net=100&country=UK" >> testrun.log
echo "" >> testrun.log
cat testrun.server.tmp | awk '{ print $9; }' >> testrun.log
kill $APP_SERVER_PID



diff testrun.log  testrun.correct
