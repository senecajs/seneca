
# Validates seneca master against seneca-joi
# Run from project root

rm -rf seneca-joi-test
git clone --depth 1 https://github.com/senecajs/seneca-joi seneca-joi-test
cd seneca-joi-test
npm ci
rm -rf node_modules/seneca
ln -s ../.. node_modules/seneca
npm test


