#!/usr/bin/env bash
# build-installer.bash
#
# WARNING the executable will be broken if you're building on windows
# See https://github.com/nexe/nexe/issues/719
#

printf "
WARNING - building on windows will result in a broken executable!
The issue is described here: https://github.com/nexe/nexe/issues/719

use ./build-installer-pkg.sh instead!
"

exit 1 # comment this line out if you want to test this script for yourself

target=${1:-"12.9.1"}

rm -rf bundle && yarn nexe --input installer.js --target "$target" --output ./installer
