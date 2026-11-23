"""Packs the app's own copy of MSIZ Terminal (android-app/msiz/www/) into the APK's www folder.

Usage (from the repo root): python3 android-app/msiz/bundle.py <dest-www-folder>

The app has its own copy of the terminal so app changes never touch the website's
msiz-terminal.html (and website changes never reach the app). Edit the files in
android-app/msiz/www/ to change the app.

- Local scripts are copied as-is (cache-busting ?v= stripped).
- CDN libraries (Chart.js) are downloaded so the app opens offline.
- Market data is read live from the website's data/market-quotes.json (the
  "Update MSIZ market data" workflow keeps it fresh); the current copy is also packed
  in so the app still shows numbers with no connection (see app-extras.js).
- The website's Home button is replaced by the app's own "APP" menu (app-extras.js).
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
REPO = os.path.normpath(os.path.join(HERE, "..", ".."))
LIVE_DATA = "https://michealsizemore1.github.io/ChatGPT-The-Master-App/data/market-quotes.json"

html = open(os.path.join(SRC, "msiz-terminal.html"), encoding="utf-8").read()
html = re.sub(r'<link[^>]*rel="manifest"[^>]*>\s*', "", html)
html = re.sub(r'<script[^>]*home-button\.js[^>]*>\s*</script>\s*', "", html)
html = re.sub(r'<a class="master-home"[^>]*>.*?</a>\s*', "", html, count=1)
html = re.sub(r'(src="[^"?]+\.js)\?[^"]*"', r'\1"', html)

before = html
html = re.sub(r"const MARKET_DATA_URL = '[^']*';", f"const MARKET_DATA_URL = '{LIVE_DATA}';", html, count=1)
if html == before:
    sys.exit("bundle.py: couldn't find MARKET_DATA_URL in msiz-terminal.html")

html = html.replace(
    "<head>",
    '<head>\n<script src="android-bridge.js"></script>\n<script src="app-extras.js"></script>',
    1,
)
for f in ("android-bridge.js", "app-extras.js"):
    shutil.copy(os.path.join(HERE, f), os.path.join(dst, f))


def fetch(url):
    rel = "cdn/" + os.path.basename(url.split("?", 1)[0])
    path = os.path.join(dst, rel)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=60) as r, open(path, "wb") as f:
        f.write(r.read())
    print("downloaded", url, "->", rel)
    return rel


for src in re.findall(r'<script[^>]*src="([^"]+)"', html):
    if src in ("android-bridge.js", "app-extras.js"):
        continue
    if src.startswith(("http:", "https:", "//")):
        url = "https:" + src if src.startswith("//") else src
        html = html.replace(f'src="{src}"', f'src="{fetch(url)}"')
        continue
    rel = os.path.normpath(src)
    os.makedirs(os.path.join(dst, os.path.dirname(rel) or "."), exist_ok=True)
    shutil.copy(os.path.join(SRC, rel), os.path.join(dst, rel))
    print("bundled", rel)

# Offline fallback copy of the market snapshot.
os.makedirs(os.path.join(dst, "data"), exist_ok=True)
shutil.copy(os.path.join(REPO, "data", "market-quotes.json"), os.path.join(dst, "data", "market-quotes.json"))
print("bundled data/market-quotes.json")

open(os.path.join(dst, "index.html"), "w", encoding="utf-8").write(html)
print("wrote index.html")
