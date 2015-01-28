if [ ! -d "./node_modules/mocha" ]; then
  npm install mocha@1
fi
if [ ! -d "./node_modules/connect" ]; then
  npm install connect@3
fi
if [ ! -d "./node_modules/connect-query" ]; then
  npm install connect-query@0
fi
if [ ! -d "./node_modules/fixture-stdout" ]; then
  npm install fixture-stdout@0
fi
if [ ! -d "./node_modules/seneca-error-test" ]; then
  npm install seneca-error-test@0
fi

./node_modules/.bin/mocha test/*.test.js test/plugin/*.test.js test/options/*.test.js
