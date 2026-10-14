#!/usr/bin/env bash
# Assemble the runtime web app into www/ (the webDir Capacitor bundles).
# Only the files the app needs at runtime are copied - no sources, no android/.
set -e
cd "$(dirname "$0")/.."

rm -rf www
mkdir -p www/data

cp index.html www/
cp -r css js vendor www/
cp data/puzzles.js data/solutions.js www/data/

echo "www/ assembled:"
du -sh www
