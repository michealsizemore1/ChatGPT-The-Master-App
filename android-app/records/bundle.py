"""Packs the app's own copy of Cindy's Record Collection (android-app/records/www/records.html, copied from
the michealsizemore1/record-collection site) into the APK's www folder as index.html.

Usage (from the repo root): python3 android-app/records/bundle.py <dest-www-folder>

Edit android-app/records/www/records.html to change the app (the record collection website is a separate repo
and isn't changed by the app). android-bridge.js (downloads, printing) and app-extras.js (updates,
app lock, backup) are added to the page.
"""
import os
import shutil
import sys

dst = sys.argv[1]
os.makedirs(dst, exist_ok=True)
HERE = os.path.dirname(os.path.abspath(__file__))
html = open(os.path.join(HERE, "www", "records.html"), encoding="utf-8").read()
html = html.replace("<head>", '<head>\n<script src="android-bridge.js"></script>\n<script src="app-extras.js"></script>', 1)
for f in ("android-bridge.js", "app-extras.js"):
    shutil.copy(os.path.join(HERE, f), os.path.join(dst, f))
open(os.path.join(dst, "index.html"), "w", encoding="utf-8").write(html)
print("wrote index.html")
