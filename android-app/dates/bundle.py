"""Packs Dates & Docs (android-app/dates/www/dates-docs.html, the app's only copy: there's no website
page for it) into the APK's www folder as index.html, with android-bridge.js (downloads, printing) and
app-extras.js (updates, app lock, backup).

Usage (from the repo root): python3 android-app/dates/bundle.py <dest-www-folder>
"""
import os
import shutil
import sys

dst = sys.argv[1]
os.makedirs(dst, exist_ok=True)
HERE = os.path.dirname(os.path.abspath(__file__))
html = open(os.path.join(HERE, "www", "dates-docs.html"), encoding="utf-8").read()
html = html.replace("<head>", '<head>\n<script src="android-bridge.js"></script>\n<script src="app-extras.js"></script>', 1)
for f in ("android-bridge.js", "app-extras.js"):
    shutil.copy(os.path.join(HERE, f), os.path.join(dst, f))
open(os.path.join(dst, "index.html"), "w", encoding="utf-8").write(html)
print("wrote index.html")
