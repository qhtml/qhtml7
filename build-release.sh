#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DIST_DIR="$ROOT_DIR/dist"
VERSION_FILE="$ROOT_DIR/js/QHTML_VERSION.txt"

RUNTIME_SOURCES=(
  "$ROOT_DIR/js/qhtml.js"
  "$ROOT_DIR/js/qhtml_types.js"
  "$ROOT_DIR/js/qhtml_parser.js"
  "$ROOT_DIR/js/qhtml-graphics-scene.js"
  "$ROOT_DIR/js/qhtml-element.js"
)

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

write_version_header() {
  local version
  version="$1"
  printf '(function (globalScope) {\n'
  printf '  const QHTML_VERSION = "%s";\n' "$version"
  printf '  globalScope.QHTML_VERSION = QHTML_VERSION;\n'
  printf '})(typeof globalThis !== "undefined" ? globalThis : window);\n'
}

assert_runtime_sources_exist() {
  local source_file
  for source_file in "${RUNTIME_SOURCES[@]}"; do
    if [[ ! -f "$source_file" ]]; then
      echo "Missing runtime source: $source_file" >&2
      exit 1
    fi
  done
}

write_native_runtime_bundle() {
  local version tmp source_file index
  version="$1"
  tmp="$(mktemp)"
  {
    write_version_header "$version"
    for index in "${!RUNTIME_SOURCES[@]}"; do
      source_file="${RUNTIME_SOURCES[$index]}"
      printf '\n/* ---- %s ---- */\n' "${source_file#$ROOT_DIR/}"
      cat "$source_file"
      if [[ "$index" -lt "$((${#RUNTIME_SOURCES[@]} - 1))" ]]; then
        printf '\n'
      fi
    done
  } > "$tmp"
  mv "$tmp" "$DIST_DIR/qhtml.js"
  chmod 0644 "$DIST_DIR/qhtml.js"
}

if [[ "$INCREASE_PATCH" -eq 1 ]]; then
  increase_patch_version
fi

QHTML_VERSION_VALUE="$(read_qhtml_version)"

assert_runtime_sources_exist
mkdir -p "$DIST_DIR"

write_native_runtime_bundle "$QHTML_VERSION_VALUE"

rm -f \
  "$DIST_DIR/qhtml-element.js" \
  "$DIST_DIR/qhtml_types.js" \
  "$DIST_DIR/qhtml_parser.js" \
  "$DIST_DIR/qhtml-graphics-scene.js" \
  "$DIST_DIR/qhtml7-wasm.js" \
  "$DIST_DIR/qhtml7-wasm.wasm"
