NPM=npm

install-deps:
	$(NPM) install --no-audit --no-fund --prefer-offline

build: install-deps
	$(NPM) run build

test: build
	$(NPM) test

run: build
	node dist/index.js

# Usage: make ls-japan, make ls-international, make ls-others
ls-%: build
	node dist/index.js --$*

sync: build
	node dist/index.js sync

clean:
	rm -rf dist

install-global:
	$(NPM) install -g .
