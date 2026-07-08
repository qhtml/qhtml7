#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DIST_DIR="$ROOT_DIR/dist"
WASM_BUILD_DIR="$ROOT_DIR/wasm/src/build/single-thread/MinSizeRel"

#/usr/local/qt/Tools/CMake/bin/cmake --build ./wasm/src/build/single-thread/MinSizeRel --target all
cd $ROOT_DIR
mkdir -p "$DIST_DIR"

cp "$WASM_BUILD_DIR/qhtml7-wasm.wasm" "$DIST_DIR/"
cp "$WASM_BUILD_DIR/qhtml7-wasm.js" "$DIST_DIR/"

if compgen -G "$ROOT_DIR/js/*.js" > /dev/null; then
  cp "$ROOT_DIR"/js/*.js "$DIST_DIR/"
fi

if compgen -G "$ROOT_DIR/src/*.js" > /dev/null; then
  cp "$ROOT_DIR"/src/*.js "$DIST_DIR/"
fi

