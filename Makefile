MOCHA_TARGET=test/*.js

test:
	make lint
	make testonly

test-watch:
	make lint
	make testonly-watch

testonly:
	NODE_ENV=test mocha $(MOCHA_TARGET)

testonly-watch:
	NODE_ENV=test mocha -w $(MOCHA_TARGET)

lint:
	standard

cov:
	istanbul cover _mocha $(MOCHA_TARGET)

.PHONY: build test test-watch testonly testonly-watch lint
