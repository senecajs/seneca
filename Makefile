
.PHONY: test test-seneca

dummy:

test: test-seneca

test-seneca:
	expresso -I lib test/seneca.test.js