#!/usr/bin/env bash

PWD=$(pwd -L)

rm -rf node_modules
npm install
npm link

sh ./test/test-included-plugins.sh
ec=$?; if [[ $ec != 0 ]]; then exit $ec; fi

npm test
ec=$?; if [[ $ec != 0 ]]; then exit $ec; fi

cd doc/examples
sh ./testrun.sh
ec=$?; if [[ $ec != 0 ]]; then exit $ec; fi

cd ../..

# setup test folder
cd ..
mkdir -p test-seneca
TEST_PWD=$(pwd -L)
cd test-seneca

# run seneca-verify
rm -rf seneca-verify
git clone git@github.com:rjrodger/seneca-verify.git
cd seneca-verify
npm link seneca
npm install
node verify
ec=$?; if [[ $ec != 0 ]]; then exit $ec; fi

# run seneca-mvp
cd ..
rm -rf seneca-mvp
git clone git@github.com:rjrodger/seneca-mvp.git
cd seneca-mvp
cp options.example.js options.mine.js
npm link seneca
npm install
npm install bower
cd public
node ../node_modules/.bin/bower install
cd ..
node mvp-app.js
ec=$?; if [[ $ec != 0 ]]; then exit $ec; fi

# run seneca-examples
cd ..
rm -rf seneca-examples
git clone git@github.com:rjrodger/seneca-examples.git
cd seneca-examples/micro-services
npm link seneca
npm install
node .
ec=$?; if [[ $ec != 0 ]]; then exit $ec; fi

# test level store
cd ..
rm -rf seneca-level-store
git clone git@github.com:senecajs/seneca-level-store.git
cd seneca-level-store
npm link seneca
npm install
npm test
ec=$?; if [[ $ec != 0 ]]; then exit $ec; fi


# test mem store
cd ..
rm -rf seneca-mem-store
git clone git@github.com:senecajs/seneca-mem-store.git
cd seneca-mem-store
npm link seneca
npm install
npm test
ec=$?; if [[ $ec != 0 ]]; then exit $ec; fi

# cleanup
rm -rf $TEST_PWD
cd $PWD
