
# Validates seneca master against seneca-doc
# Run from project root

rm -rf seneca-doc-test
git clone --depth 1 https://github.com/senecajs/seneca-doc seneca-doc-test
cd seneca-doc-test
npm ci
rm -rf node_modules/seneca
ln -s ../.. node_modules/seneca
npm test


