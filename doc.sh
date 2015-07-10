./node_modules/.bin/docco seneca.js -o doc
cp -r doc/* ../gh-pages/seneca/doc

cd docpad
./node_modules/.bin/docpad generate --env static
cd ..

cp -r docpad/out/* ../gh-pages/seneca
