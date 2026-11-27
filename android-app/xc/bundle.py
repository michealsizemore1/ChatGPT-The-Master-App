"""Packs the app's own copy of Cross Country (android-app/xc/www/cross-country.html) into the APK's www folder.

Usage (from the repo root): python3 android-app/xc/bundle.py <dest-www-folder>

The app has its own copy so app changes never touch the website's cross-country.html (and website changes never
reach the app). Edit android-app/xc/www/ to change the app.
- The website's Home button is left out (the app has its own ⚙ menu).
"""
import os
import re
import shutil
import sys

dst = sys.argv[1]
os.makedirs(dst, exist_ok=True)
HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, "www")
REPO = os.path.normpath(os.path.join(HERE, "..", ".."))

html = open(os.path.join(SRC, "cross-country.html"), encoding="utf-8").read()
html = re.sub(r'<link[^>]*rel="manifest"[^>]*>\s*', "", html)
html = re.sub(r'<script[^>]*home-button\.js[^>]*>\s*</script>\s*', "", html)
# The website's ⌂ Home link becomes the app's ⚙ menu button (app-extras.js).
html = html.replace('<a class="home" href="index.html" aria-label="Home">&#8962;</a>', '<button class="home" id="appMenuSlot" type="button" aria-label="App settings">&#9881;</button>', 1)
html = re.sub(r'(src="[^"?]+\.js)\?[^"]*"', r'\1"', html)
html = html.replace("<head>", '<head>\n<script src="android-bridge.js"></script>\n<script src="app-extras.js"></script>', 1)
for f in ("android-bridge.js", "app-extras.js"):
    shutil.copy(os.path.join(HERE, f), os.path.join(dst, f))
for src in re.findall(r'<script[^>]*src="([^"]+)"', html):
    if src in ("android-bridge.js", "app-extras.js") or src.startswith(("http:", "https:", "//")):
        continue
    shutil.copy(os.path.join(SRC, src), os.path.join(dst, src))
    print("bundled", src)
open(os.path.join(dst, "index.html"), "w", encoding="utf-8").write(html)
os.makedirs(os.path.join(dst, "data"), exist_ok=True)
shutil.copy(os.path.join(REPO, "data", "xc-news.json"), os.path.join(dst, "data", "xc-news.json"))
print("bundled data/xc-news.json (offline fallback; the app reads the live copy from the website)")
print("wrote index.html")
