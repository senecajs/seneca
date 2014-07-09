./node_modules/.bin/jshint lib/*.js
./node_modules/.bin/docco lib/seneca.js -o doc
cp -r doc/* ../gh-pages/seneca/doc
