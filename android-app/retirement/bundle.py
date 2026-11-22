"""Packs retirement-planner.html and everything it loads into the APK's www folder.

Usage (from the repo root): python3 android-app/retirement/bundle.py <dest-www-folder>

- Local scripts are copied as-is (cache-busting ?v= stripped).
- CDN libraries (Chart.js, pdf.js, ...) are downloaded so the app works offline.
- pdf.js's worker is loaded as a plain script: inside the app, pdf.js then reads
  PDFs on the main thread instead of trying to start a worker from the CDN.
- The website's floating Home button is left out (there's no home page in the app).
"""
import os
import re
import shutil
import sys
import urllib.request

dst = sys.argv[1]
os.makedirs(dst, exist_ok=True)

html = open("retirement-planner.html", encoding="utf-8").read()
html = re.sub(r'<link[^>]*rel="manifest"[^>]*>\s*', "", html)
html = re.sub(r'<script[^>]*home-button\.js[^>]*>\s*</script>\s*', "", html)
html = re.sub(r'(src="[^"?]+\.js)\?[^"]*"', r'\1"', html)
html = html.replace("<head>", '<head>\n<script src="android-bridge.js"></script>', 1)

PDF_WORKER = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js"


def fetch(url):
    rel = "cdn/" + url.split("/ajax/libs/", 1)[-1] if "/ajax/libs/" in url else "cdn/" + os.path.basename(url)
    path = os.path.join(dst, rel)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=60) as r, open(path, "wb") as f:
        f.write(r.read())
    print("downloaded", url, "->", rel)
    return rel


for src in re.findall(r'<script[^>]*src="([^"]+)"', html):
    if src == "android-bridge.js":
        continue
    if src.startswith(("http:", "https:", "//")):
        url = "https:" + src if src.startswith("//") else src
        rel = fetch(url)
        html = html.replace(f'src="{src}"', f'src="{rel}"')
        if "pdf.js" in url and url.endswith("/pdf.min.js"):
            worker = fetch(PDF_WORKER)
            html = re.sub(
                r'(<script[^>]*src="%s"[^>]*>\s*</script>)' % re.escape(rel),
                r'\1\n<script src="%s" defer></script>' % worker,
                html,
                count=1,
            )
        continue
    rel = os.path.normpath(src)
    os.makedirs(os.path.join(dst, os.path.dirname(rel)), exist_ok=True)
    shutil.copy(rel, os.path.join(dst, rel))
    print("bundled", rel)

open(os.path.join(dst, "index.html"), "w", encoding="utf-8").write(html)
print("wrote index.html")
