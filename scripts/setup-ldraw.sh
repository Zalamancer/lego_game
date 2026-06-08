#!/usr/bin/env bash
# One-time setup: download the LDraw parts library locally so the web app
# can load real LEGO part geometry via three.js LDrawLoader.
#
# Usage: bash scripts/setup-ldraw.sh
#
# Result: ./assets/ldraw/  containing LDConfig.ldr, parts/, p/, models/, etc.
# License: LDraw library is CC BY 2.0 (https://www.ldraw.org/article/340.html)
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DEST="$ROOT/assets/ldraw"
URL="https://library.ldraw.org/library/updates/complete.zip"

if [[ -f "$DEST/LDConfig.ldr" ]]; then
  echo "LDraw library already present at $DEST"
  echo "(delete that folder and re-run if you want to refresh)"
  exit 0
fi

mkdir -p "$DEST"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

echo "Downloading LDraw library (~80MB) from library.ldraw.org ..."
curl -L --fail -o "$TMP/complete.zip" "$URL"

echo "Extracting ..."
unzip -q "$TMP/complete.zip" -d "$TMP"

# the zip extracts to $TMP/ldraw/...
if [[ -d "$TMP/ldraw" ]]; then
  # move contents up
  shopt -s dotglob
  mv "$TMP/ldraw/"* "$DEST/"
else
  # in case the zip ever changes layout, just move everything
  mv "$TMP/"* "$DEST/" 2>/dev/null || true
fi

echo ""
echo "Done. LDraw library is at:"
echo "  $DEST"
echo ""
echo "You can now open index-ldraw.html in your browser."
echo "(Serve the folder over http — file:// will block fetch():"
echo "   cd '$ROOT' && python3 -m http.server 8000"
echo "   then visit http://localhost:8000/index-ldraw.html )"
