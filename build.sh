if [ ! -d "./node_modules/docco" ]; then
  npm install docco@0
fi
if [ ! -d "./node_modules/jshint" ]; then
  npm install jshint@2
fi
./node_modules/.bin/jshint seneca.js lib/*.js
./node_modules/.bin/docco seneca.js -o doc
cp -r doc/* ../gh-pages/seneca/doc
