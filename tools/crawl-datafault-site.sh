#!/usr/bin/env bash
set -euo pipefail

URL="${1:-https://datafault.net/}"
TARGET="${2:-tmp/site}"
HOST="${QHTML_CRAWL_HOST:-datafault.net}"
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TARGET_DIR="$ROOT_DIR/$TARGET"
TMP_PARENT="$ROOT_DIR/tmp"
WORK_DIR="$TMP_PARENT/.site-download-$$"
SEED_FILE="$WORK_DIR/seeds.txt"

cleanup() {
  rm -rf "$WORK_DIR"
}
trap cleanup EXIT

mkdir -p "$TMP_PARENT"
rm -rf "$WORK_DIR"
mkdir -p "$WORK_DIR"

echo "Crawling $URL"
echo "Output target: $TARGET_DIR"

fetch_text() {
  if command -v curl >/dev/null 2>&1; then
    curl -fsSL "$1"
  elif command -v wget >/dev/null 2>&1; then
    wget -q -O - "$1"
  else
    return 1
  fi
}

collect_sitemap_urls() {
  local sitemap_url="$1"
  local sitemap_text
  sitemap_text="$(fetch_text "$sitemap_url" 2>/dev/null || true)"
  if [ -z "$sitemap_text" ]; then
    return 0
  fi

  printf '%s\n' "$sitemap_text" |
    sed -n 's:.*<loc>\(.*\)</loc>.*:\1:p' |
    while IFS= read -r loc; do
      case "$loc" in
        https://"$HOST"/*.xml|https://www."$HOST"/*.xml)
          collect_sitemap_urls "$loc"
          ;;
        https://"$HOST"/*|https://www."$HOST"/*)
          printf '%s\n' "$loc" >> "$SEED_FILE"
          ;;
      esac
    done
}

printf '%s\n' "$URL" > "$SEED_FILE"
collect_sitemap_urls "https://$HOST/sitemap.xml"
sort -u "$SEED_FILE" -o "$SEED_FILE"
mapfile -t SEEDS < "$SEED_FILE"
echo "Seed URLs: ${#SEEDS[@]}"

if command -v httrack >/dev/null 2>&1; then
  RAW_DIR="$WORK_DIR/raw"
  mkdir -p "$RAW_DIR"

  httrack "${SEEDS[@]}" \
    -O "$RAW_DIR" \
    "-*" \
    "+https://$HOST/*" \
    "+https://www.$HOST/*" \
    --depth=99 \
    --ext-depth=2 \
    --robots=0 \
    --quiet

  SITE_DIR="$WORK_DIR/site"
  mkdir -p "$SITE_DIR"

  copied=0
  if [ -d "$RAW_DIR/$HOST" ]; then
    cp -a "$RAW_DIR/$HOST/." "$SITE_DIR/"
    copied=1
  fi
  if [ -d "$RAW_DIR/www.$HOST" ]; then
    cp -a "$RAW_DIR/www.$HOST/." "$SITE_DIR/"
    copied=1
  fi
  if [ "$copied" -ne 1 ]; then
    echo "httrack completed, but no $HOST site folder was created under $RAW_DIR" >&2
    exit 1
  fi
elif command -v wget >/dev/null 2>&1; then
  SITE_DIR="$WORK_DIR/site"
  mkdir -p "$SITE_DIR"

  wget \
    --mirror \
    --page-requisites \
    --convert-links \
    --adjust-extension \
    --no-parent \
    --domains "$HOST,www.$HOST" \
    --no-host-directories \
    --directory-prefix "$SITE_DIR" \
    --input-file "$SEED_FILE"
else
  echo "Missing crawler dependency. Install httrack or wget, then rerun this script." >&2
  exit 127
fi

rm -rf "$TARGET_DIR"
mkdir -p "$(dirname "$TARGET_DIR")"
mv "$SITE_DIR" "$TARGET_DIR"

if command -v python3 >/dev/null 2>&1; then
  python3 - "$TARGET_DIR" "$HOST" <<'PY'
import pathlib
import re
import sys
import time
import urllib.request
from urllib.parse import urljoin, urlparse

root = pathlib.Path(sys.argv[1]).resolve()
host = sys.argv[2]
seen = set()
pattern = re.compile(r"q-(?:import|require)\s*\{\s*([\"'`]?)([^\"'`\s}]+)\1", re.IGNORECASE)

def fetch_bytes(url, attempts=4):
    last_error = None
    for attempt in range(1, attempts + 1):
        try:
            request = urllib.request.Request(url, headers={"User-Agent": "qhtml7-site-crawler/1.0"})
            with urllib.request.urlopen(request, timeout=30) as response:
                return response.read()
        except Exception as error:
            last_error = error
            if attempt < attempts:
                time.sleep(min(2 * attempt, 6))
    raise last_error

def iter_sources():
    for suffix in (".html", ".htm", ".qhtml"):
        yield from root.rglob(f"*{suffix}")

def local_target(source_file, import_path):
    parsed = urlparse(import_path)
    if parsed.scheme:
        if parsed.netloc not in {host, "www." + host}:
            return None, None
        rel = parsed.path.lstrip("/")
        url = import_path
    elif import_path.startswith("/"):
        rel = import_path.lstrip("/")
        url = "https://" + host + "/" + rel
    else:
        try:
            rel = str((source_file.parent / import_path).resolve().relative_to(root))
        except ValueError:
            return None, None
        url = urljoin("https://" + host + "/" + str(source_file.parent.relative_to(root)).strip("/") + "/", import_path)
    return root / rel, url

changed = True
while changed:
    changed = False
    for source_file in list(iter_sources()):
        try:
            text = source_file.read_text(encoding="utf-8", errors="ignore")
        except OSError:
            continue
        for match in pattern.finditer(text):
            target, url = local_target(source_file, match.group(2))
            if target is None or url is None:
                continue
            key = str(target)
            if key in seen or target.exists():
                continue
            seen.add(key)
            target.parent.mkdir(parents=True, exist_ok=True)
            try:
                target.write_bytes(fetch_bytes(url))
                print("Fetched QHTML import:", target.relative_to(root))
                changed = True
            except Exception as error:
                print("Missing QHTML import:", url, "->", target.relative_to(root), "(" + str(error) + ")", file=sys.stderr)
PY
fi

echo "Saved mirror to $TARGET_DIR"
