"""Packs the app's own copy of Saturday Top 25 (android-app/top25/www/top-25.html) into the APK's www folder.

Usage (from the repo root): python3 android-app/top25/bundle.py <dest-www-folder>

The app has its own copy so app changes never touch the website's top-25.html (and website changes never
reach the app). Edit android-app/top25/www/ to change the app.
- Scores, rankings and schedules come live from ESPN, as on the website.
- The weekly stories file (data/top25-stories.json) is read live from the website; the current copy is
  packed in as an offline fallback (see app-extras.js).
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

html = open(os.path.join(SRC, "top-25.html"), encoding="utf-8").read()
html = re.sub(r'<link[^>]*rel="manifest"[^>]*>\s*', "", html)
html = re.sub(r'<script[^>]*home-button\.js[^>]*>\s*</script>\s*', "", html)
html = re.sub(r'(src="[^"?]+\.js)\?[^"]*"', r'\1"', html)
html = html.replace("<head>", '<head>\n<script src="android-bridge.js"></script>\n<script src="app-extras.js"></script>', 1)
for f in ("android-bridge.js", "app-extras.js"):
    shutil.copy(os.path.join(HERE, f), os.path.join(dst, f))
for src in re.findall(r'<script[^>]*src="([^"]+)"', html):
    if src in ("android-bridge.js", "app-extras.js") or src.startswith(("http:", "https:", "//")):
        continue
    shutil.copy(os.path.join(SRC, src), os.path.join(dst, src))
    print("bundled", src)
os.makedirs(os.path.join(dst, "data"), exist_ok=True)
shutil.copy(os.path.join(REPO, "data", "top25-stories.json"), os.path.join(dst, "data", "top25-stories.json"))
print("bundled data/top25-stories.json")
open(os.path.join(dst, "index.html"), "w", encoding="utf-8").write(html)
print("wrote index.html")
