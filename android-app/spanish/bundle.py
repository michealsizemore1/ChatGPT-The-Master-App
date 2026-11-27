"""Packs the app's own copy of Luma Spanish (android-app/spanish/www/) into the APK's www folder.

Usage (from the repo root): python3 android-app/spanish/bundle.py <dest-www-folder>

The app has its own copy of the page so app changes never touch the website's
spanish-learning.html (and website changes never reach the app). Edit the files in
android-app/spanish/www/ to change the app.

- The website's floating Home button is left out (the app has its own ⚙ menu, app-extras.js).
- android-bridge.js (downloads, and the phone's own voice and speech recognition for the lessons)
  and app-extras.js (updates, app lock, backup) are added to the page.
"""
import os
import re
import shutil
import sys

dst = sys.argv[1]
os.makedirs(dst, exist_ok=True)
HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, "www")

html = open(os.path.join(SRC, "spanish-learning.html"), encoding="utf-8").read()
html = re.sub(r'<link[^>]*rel="manifest"[^>]*>\s*', "", html)
html = re.sub(r'<script[^>]*home-button\.js[^>]*>\s*</script>\s*', "", html)
html = re.sub(r'(src="[^"?]+\.js)\?[^"]*"', r'\1"', html)
html = html.replace(
    "<head>",
    '<head>\n<script src="android-bridge.js"></script>\n<script src="app-extras.js"></script>',
    1,
)
for f in ("android-bridge.js", "app-extras.js"):
    shutil.copy(os.path.join(HERE, f), os.path.join(dst, f))

for src in re.findall(r'<script[^>]*src="([^"]+)"', html):
    if src in ("android-bridge.js", "app-extras.js") or src.startswith(("http:", "https:", "//")):
        continue
    rel = os.path.normpath(src)
    os.makedirs(os.path.join(dst, os.path.dirname(rel) or "."), exist_ok=True)
    shutil.copy(os.path.join(SRC, rel), os.path.join(dst, rel))
    print("bundled", rel)

open(os.path.join(dst, "index.html"), "w", encoding="utf-8").write(html)
print("wrote index.html")
