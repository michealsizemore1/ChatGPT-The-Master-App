"""Packs Vehicle Upkeep (android-app/upkeep/www/vehicle-upkeep.html, the app's only copy: there's no website
page for it) into the APK's www folder as index.html, with android-bridge.js (downloads, printing) and
app-extras.js (updates, app lock, backup) and ../attach.js (receipts & documents).

Usage (from the repo root): python3 android-app/upkeep/bundle.py <dest-www-folder>
"""
import os
import shutil
import sys

dst = sys.argv[1]
os.makedirs(dst, exist_ok=True)
HERE = os.path.dirname(os.path.abspath(__file__))
html = open(os.path.join(HERE, "www", "vehicle-upkeep.html"), encoding="utf-8").read()
html = html.replace("<head>", '<head>\n<script src="android-bridge.js"></script>\n<script src="app-extras.js"></script>\n<script src="attach.js"></script>', 1)
for f in ("android-bridge.js", "app-extras.js"):
    shutil.copy(os.path.join(HERE, f), os.path.join(dst, f))
shutil.copy(os.path.join(HERE, "..", "attach.js"), os.path.join(dst, "attach.js"))
open(os.path.join(dst, "index.html"), "w", encoding="utf-8").write(html)
print("wrote index.html")
