"""Packs the app's own copy of the Family Benefits Hub (android-app/benefits/www/) into the APK's www folder.

Usage (from the repo root): python3 android-app/benefits/bundle.py <dest-www-folder>

The app has its own copy of the page so app changes never touch the website's
family-benefits-hub.html (and website changes never reach the app). Edit the files in
android-app/benefits/www/ to change the app.

- The page has no outside libraries, so the app works fully offline.
- The website's floating Home button and its suite-wide "Full Backup" script are left out:
  the app keeps its own daily backups (Downloads/Family Benefits Hub/Auto backups).
"""
import os
import re
import shutil
import sys

dst = sys.argv[1]
os.makedirs(dst, exist_ok=True)
SRC = os.path.join(os.path.dirname(os.path.abspath(__file__)), "www")

html = open(os.path.join(SRC, "family-benefits-hub.html"), encoding="utf-8").read()
html = re.sub(r'<link[^>]*rel="manifest"[^>]*>\s*', "", html)
html = re.sub(r'<script[^>]*home-button\.js[^>]*>\s*</script>\s*', "", html)
html = re.sub(r'<script[^>]*master-backup-shared\.js[^>]*>\s*</script>\s*', "", html)
html = re.sub(r'(src="[^"?]+\.js)\?[^"]*"', r'\1"', html)
html = html.replace("<head>", '<head>\n<script src="android-bridge.js"></script>', 1)

for src in re.findall(r'<script[^>]*src="([^"]+)"', html):
    if src == "android-bridge.js":
        continue
    if src.startswith(("http:", "https:", "//")):
        sys.exit("The app copy must not load scripts from the internet: " + src)
    rel = os.path.normpath(src)
    os.makedirs(os.path.join(dst, os.path.dirname(rel)), exist_ok=True)
    shutil.copy(os.path.join(SRC, rel), os.path.join(dst, rel))
    print("bundled", rel)

open(os.path.join(dst, "index.html"), "w", encoding="utf-8").write(html)
print("wrote index.html")
