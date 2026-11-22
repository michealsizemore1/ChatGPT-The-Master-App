#!/usr/bin/env bash
# Puts the receipt reader (Tesseract) and the Inter font inside the app so they work without internet.
# Usage: bundle-offline.sh <www folder that already holds index.html>
set -euo pipefail
WWW="$1"
TMP="$(mktemp -d)"
( cd "$TMP" && npm init -y >/dev/null && npm install --silent --no-audit --no-fund \
    tesseract.js@5 tesseract.js-core@5 @tesseract.js-data/eng@1 @fontsource/inter@5 )
NM="$TMP/node_modules"

T="$WWW/vendor/tesseract"
mkdir -p "$T/core" "$T/lang" "$WWW/vendor/fonts"
cp "$NM/tesseract.js/dist/tesseract.min.js" "$NM/tesseract.js/dist/worker.min.js" "$T/"
cp "$NM/tesseract.js-core/tesseract-core-lstm.wasm.js" "$NM/tesseract.js-core/tesseract-core-simd-lstm.wasm.js" "$T/core/"
cp "$NM/@tesseract.js-data/eng/4.0.0_best_int/eng.traineddata.gz" "$T/lang/"

CSS="$WWW/vendor/fonts/inter.css"
: > "$CSS"
for w in 400 500 600 700 800; do
  cp "$NM/@fontsource/inter/files/inter-latin-$w-normal.woff2" "$WWW/vendor/fonts/"
  printf '@font-face{font-family:"Inter";font-style:normal;font-weight:%s;font-display:swap;src:url("inter-latin-%s-normal.woff2") format("woff2");}\n' "$w" "$w" >> "$CSS"
done

python3 - "$WWW/index.html" <<'PY'
import re, sys
p = sys.argv[1]; html = open(p, encoding="utf-8").read()
html = re.sub(r'<script[^>]*src="https://cdn\.jsdelivr\.net/npm/tesseract\.js@5/dist/tesseract\.min\.js"[^>]*></script>',
              '<script src="vendor/tesseract/tesseract.min.js"></script>', html)
html = re.sub(r'<link[^>]*href="https://fonts\.googleapis\.com/css2[^"]*"[^>]*>', '<link rel="stylesheet" href="vendor/fonts/inter.css">', html)
html = re.sub(r'<link[^>]*rel="preconnect"[^>]*fonts\.(googleapis|gstatic)\.com[^>]*>\s*', '', html)
assert "vendor/tesseract/tesseract.min.js" in html and "vendor/fonts/inter.css" in html, "offline rewrite failed"
open(p, "w", encoding="utf-8").write(html)
PY
rm -rf "$TMP"
echo "Bundled receipt reader and Inter font into $WWW"
