echo ---seneca-basic---
cd ../seneca-basic
./test.sh link

echo ---seneca-mem-store---
cd ../seneca-mem-store
./test.sh link

echo ---seneca-transport---
cd ../seneca-transport
./test.sh link

echo ---seneca-web---
cd ../seneca-web
./test.sh link


# not included, but used in tests
echo ---seneca-echo---
cd ../seneca-echo
./test.sh link



