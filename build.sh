./node_modules/.bin/jshint seneca.js lib/*.js
./node_modules/.bin/docco seneca.js -o doc
cp -r doc/* ../gh-pages/seneca/doc
