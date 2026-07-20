#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DIST_DIR="$ROOT_DIR/dist"
WASM_BUILD_DIR="$ROOT_DIR/wasm/src/build/single-thread/MinSizeRel"
VERSION_FILE="$ROOT_DIR/wasm/src/qhtml7-wasm/resources/qhtml7/version.txt"

INCREASE_PATCH=0
for arg in "$@"; do
  case "$arg" in
    --increase-patch)
      INCREASE_PATCH=1
      ;;
    *)
      echo "Unknown option: $arg" >&2
      echo "Usage: $0 [--increase-patch]" >&2
      exit 1
      ;;
  esac
done

read_qhtml_version() {
  tr -d '[:space:]' < "$VERSION_FILE"
}

increase_patch_version() {
  local current major minor patch extra
  current="$(read_qhtml_version)"
  IFS=. read -r major minor patch extra <<< "$current"
  if [[ -n "${extra:-}" || ! "$major" =~ ^[0-9]+$ || ! "$minor" =~ ^[0-9]+$ || ! "$patch" =~ ^[0-9]+$ ]]; then
    echo "Invalid QHTML version in $VERSION_FILE: $current" >&2
    exit 1
  fi
  patch=$((patch + 1))
  printf '%s.%s.%s\n' "$major" "$minor" "$patch" > "$VERSION_FILE"
}

prepend_version_header() {
  local file version tmp
  file="$1"
  version="$2"
  tmp="$(mktemp)"
  {
    printf '(function (globalScope) {\n'
    printf '  const QHTML_VERSION = "%s";\n' "$version"
    printf '  globalScope.QHTML_VERSION = QHTML_VERSION;\n'
    printf '})(typeof globalThis !== "undefined" ? globalThis : window);\n\n'
    cat "$file"
  } > "$tmp"
  mv "$tmp" "$file"
}

copy_release_js() {
  local source_dir source_file dest_file version
  source_dir="$1"
  version="$2"
  if compgen -G "$source_dir/*.js" > /dev/null; then
    for source_file in "$source_dir"/*.js; do
      dest_file="$DIST_DIR/$(basename "$source_file")"
      cp "$source_file" "$dest_file"
      prepend_version_header "$dest_file" "$version"
    done
  fi
}

if [[ "$INCREASE_PATCH" -eq 1 ]]; then
  increase_patch_version
fi

QHTML_VERSION_VALUE="$(read_qhtml_version)"

if ! EMSDK_BIN="$(which emsdk 2>/dev/null)"; then
  echo "emsdk was not found in PATH" >&2
  exit 1
fi
EMSDK_DIR="$(cd "$(dirname "$EMSDK_BIN")" && pwd)"

source "$EMSDK_DIR/emsdk_env.sh"
/usr/local/qt/Tools/CMake/bin/cmake --build "$WASM_BUILD_DIR" --target clean
/usr/local/qt/Tools/CMake/bin/cmake --build "$WASM_BUILD_DIR" --parallel
cd $ROOT_DIR
mkdir -p "$DIST_DIR"

cp "$WASM_BUILD_DIR/qhtml7-wasm.wasm" "$DIST_DIR/"
cp "$WASM_BUILD_DIR/qhtml7-wasm.js" "$DIST_DIR/"

copy_release_js "$ROOT_DIR/js" "$QHTML_VERSION_VALUE"
copy_release_js "$ROOT_DIR/src" "$QHTML_VERSION_VALUE"
