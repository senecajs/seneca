
# Run from project root

rm -rf smoke-test
git clone --depth 1 https://github.com/senecajs/smoke-test
mkdir -p smoke-test/node_modules
ln -s ../.. smoke-test/node_modules/seneca
cd smoke-test
npm test


