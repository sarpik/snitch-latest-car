#!/usr/bin/env bash
# build-installer.bash
#
# I've also tried `nexe/nexe`, but came across an issue:
# https://github.com/nexe/nexe/issues/719
#

outDir="compiled-installers"
fileNameTemplate="$outDir/installer"

rm -rf "$outDir" && yarn pkg ./package.json --output "$fileNameTemplate" --target "node12-linux,node12-win,node12-macos"
