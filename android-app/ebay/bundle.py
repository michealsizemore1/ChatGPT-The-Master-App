"""Packs the app's own copy of the eBay tracker (android-app/ebay/www/) into the APK's www folder.

Usage (from the repo root): python3 android-app/ebay/bundle.py <dest-www-folder>

The app has its own copy so app changes never touch the website's ebay-tracker.html /
ebay-business-plan.html (and website changes never reach the app). Edit the files in
android-app/ebay/www/ to change the app.

- The tracker becomes index.html; the Business Plan page comes along (shown inside the app).
- The website's Home button / Master App links are left out (the app has its own ⚙ menu, app-extras.js).
- CDN libraries (Chart.js) are downloaded so the app opens offline.
"""
import os
import re
import shutil
import sys
import urllib.request

dst = sys.argv[1]
os.makedirs(dst, exist_ok=True)
HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, "www")


def fetch(url):
    rel = "cdn/" + os.path.basename(url.split("?", 1)[0])
    path = os.path.join(dst, rel)
    if not os.path.exists(path):
        os.makedirs(os.path.dirname(path), exist_ok=True)
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req, timeout=60) as r, open(path, "wb") as f:
            f.write(r.read())
        print("downloaded", url, "->", rel)
    return rel


def pack(name, out, extras):
    html = open(os.path.join(SRC, name), encoding="utf-8").read()
    html = re.sub(r'<link[^>]*rel="manifest"[^>]*>\s*', "", html)
    html = re.sub(r'<script[^>]*home-button\.js[^>]*>\s*</script>\s*', "", html)
    html = re.sub(r'(src="[^"?]+\.js)\?[^"]*"', r'\1"', html)
    html = html.replace("<head>", "<head>\n" + "\n".join(f'<script src="{e}"></script>' for e in extras), 1)
    for src in re.findall(r'<script[^>]*src="([^"]+)"', html):
        if src in extras:
            continue
        if src.startswith(("http:", "https:", "//")):
            url = "https:" + src if src.startswith("//") else src
            html = html.replace(f'src="{src}"', f'src="{fetch(url)}"')
            continue
        rel = os.path.normpath(src)
        os.makedirs(os.path.join(dst, os.path.dirname(rel) or "."), exist_ok=True)
        shutil.copy(os.path.join(SRC, rel), os.path.join(dst, rel))
        print("bundled", rel)
    return html


for f in ("android-bridge.js", "app-extras.js"):
    shutil.copy(os.path.join(HERE, f), os.path.join(dst, f))

# The tracker: the Business Plan links open inside the app (not a new tab).
tracker = pack("ebay-tracker.html", "index.html", ["android-bridge.js", "app-extras.js"])
tracker = tracker.replace('href="ebay-business-plan.html" target="_blank" rel="noopener"', 'href="ebay-business-plan.html"')
open(os.path.join(dst, "index.html"), "w", encoding="utf-8").write(tracker)
print("wrote index.html")

# The Business Plan: "← Tracker" goes back to the app's tracker; the Master App link is left out.
plan = pack("ebay-business-plan.html", "ebay-business-plan.html", ["android-bridge.js"])
plan = plan.replace('href="ebay-tracker.html"', 'href="index.html"')
plan = re.sub(r'<a href="index.html">⌂ Master App</a>', "", plan)
open(os.path.join(dst, "ebay-business-plan.html"), "w", encoding="utf-8").write(plan)
print("wrote ebay-business-plan.html")
