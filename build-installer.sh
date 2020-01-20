#!/usr/bin/env bash
# build-installer.bash

target=${1:-"12.9.1"}

rm -rf bundle && yarn nexe --input installer.js --target "$target" --output ./installer
