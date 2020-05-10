
# Validates seneca master against seneca-entity
# Run from project root

rm -rf seneca-entity-test
git clone --depth 1 https://github.com/senecajs/seneca-entity seneca-entity-test
cd seneca-entity-test
npm ci
rm -rf node_modules/seneca
ln -s ../.. node_modules/seneca
npm test


