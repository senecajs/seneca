
.PHONY: test test-seneca

dummy:

test: test-seneca

test-seneca:
	mocha test/seneca.test.js