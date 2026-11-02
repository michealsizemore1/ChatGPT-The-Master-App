#!/usr/bin/env python3
"""Build data/xc-meets.json for the XC Meets Android widget.

Two parts:
  - "meets": the 2026 Division I meet calendar (same meets as the Meets tab
    on cross-country.html), with ISO dates so the widget can show what's next.
  - "results": recent meet-result headlines (team titles, champions, places)
    from public Google News RSS searches, newest first.

Runs every few hours via .github/workflows/update-xc-meets.yml so results
show up the same day a meet is run. Reuses the fetch helpers from
update_xc_news.py.
"""

from __future__ import annotations

import json
import sys
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET
from datetime import datetime, timedelta, timezone
from email.utils import parsedate_to_datetime
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from update_xc_news import HEADERS, norm_key, strip_source_suffix  # noqa: E402

OUTPUT = Path(__file__).resolve().parents[1] / "data" / "xc-meets.json"
WINDOW_DAYS = 14
MAX_RESULTS = 15
MAX_PER_SOURCE = 3

QUERIES = [
    "cross country championships results",
    "cross country invitational team title",
    "cross country conference championship wins",
    "NCAA cross country results",
]

# A headline must mention cross country (or a marquee XC meet) ...
XC_WORDS = (
    "cross country", " xc ", " xc:", "harriers", "nuttycombe", "pre-nationals", "griak",
    "jamboree", "paul short", "joe piane", "gans creek", "mcnichols",
)
# ... and read like a result rather than a preview or feature.
RESULT_WORDS = (
    " win", " wins", " won", "title", "champion", "crowned", "claim", "capture",
    "sweep", "runner-up", "place", "finish", "results", "top-", "top ", "repeat",
    "defend", "victory", "victorious", "first", "second", "third",
)
SKIP_WORDS = ("preview", "schedule", "how to watch", "what to know", "set to", "heads to", "ahead of",
              "headed", "meet day", "info:")
# The Cross Country app covers college; drop high school coverage.
HIGH_SCHOOL_WORDS = ("high school", "boys", "girls", "class ", "sectional", "state cross country",
                     "state title", "1a", "2a", "3a", "4a", "5a", "6a", "ciac", "cif ", "ihsaa",
                     "uil", "district", "county", "milesplit")

# The 2026 meet calendar, matching the Meets tab on cross-country.html.
MEETS = [
    {"name": "Gans Creek Classic", "start": "2026-09-25", "end": "2026-09-25",
     "where": "Columbia, MO (host: Missouri)"},
    {"name": "Cowboy Jamboree", "start": "2026-09-26", "end": "2026-09-26",
     "where": "Stillwater, OK (host: Oklahoma State)"},
    {"name": "Joe Piane Notre Dame Invitational & Paul Short Run", "start": "2026-10-02", "end": "2026-10-02",
     "where": "Notre Dame, IN · Bethlehem, PA"},
    {"name": "Nuttycombe Wisconsin Invitational", "start": "2026-10-09", "end": "2026-10-09",
     "where": "Madison, WI (host: Wisconsin)", "watch": "FloTrack"},
    {"name": "Pre-Nationals & IC4A/ECAC Championships", "start": "2026-10-16", "end": "2026-10-16",
     "where": "Terre Haute, IN · New York"},
    {"name": "Conference Championships", "start": "2026-10-29", "end": "2026-11-01",
     "where": "Nationwide",
     "watch": "Big 12 & Big Sky on ESPN+, ACC on ACC Network, SEC on SEC Network, Big Ten on B1G+"},
    {"name": "NCAA Regional Championships", "start": "2026-11-13", "end": "2026-11-13",
     "where": "Nine regional sites nationwide", "watch": "FloTrack"},
    {"name": "NCAA Division I Championships", "start": "2026-11-21", "end": "2026-11-21",
     "where": "Terre Haute, IN (host: Indiana State)", "watch": "ESPNU + FloTrack"},
]


def fetch(query: str) -> list[dict]:
    url = ("https://news.google.com/rss/search?q=" + urllib.parse.quote(query)
           + "&hl=en-US&gl=US&ceid=US:en")
    request = urllib.request.Request(url, headers=HEADERS)
    with urllib.request.urlopen(request, timeout=20) as response:
        root = ET.fromstring(response.read())
    items = []
    for el in root.findall("./channel/item"):
        title = (el.findtext("title") or "").strip()
        link = (el.findtext("link") or "").strip()
        pub = (el.findtext("pubDate") or "").strip()
        source = (el.findtext("source") or "").strip()
        if not (title and link and pub and source):
            continue
        try:
            published = parsedate_to_datetime(pub)
        except (TypeError, ValueError):
            continue
        items.append({"title": strip_source_suffix(title, source), "link": link,
                      "published": published, "source": source})
    return items


def looks_like_result(title: str) -> bool:
    t = " " + title.lower()
    return (any(w in t for w in XC_WORDS)
            and any(w in t for w in RESULT_WORDS)
            and not any(w in t for w in SKIP_WORDS)
            and not any(w in t for w in HIGH_SCHOOL_WORDS))


def build_results() -> list[dict]:
    cutoff = datetime.now(timezone.utc) - timedelta(days=WINDOW_DAYS)
    pool: list[dict] = []
    for q in QUERIES:
        try:
            pool += fetch(q)
        except Exception as exc:  # one bad query shouldn't sink the rest
            print(f"query failed: {q!r}: {exc}", file=sys.stderr)
    pool = [i for i in pool if i["published"] >= cutoff and looks_like_result(i["title"])]
    pool.sort(key=lambda i: i["published"], reverse=True)

    seen: set = set()
    per_source: dict = {}
    picked: list[dict] = []
    for item in pool:
        key = norm_key(item["title"])
        if any(w in item["source"].lower() for w in HIGH_SCHOOL_WORDS):
            continue
        if key in seen or per_source.get(item["source"], 0) >= MAX_PER_SOURCE:
            continue
        seen.add(key)
        per_source[item["source"]] = per_source.get(item["source"], 0) + 1
        picked.append({
            "date": item["published"].astimezone(timezone.utc).strftime("%Y-%m-%d"),
            "headline": item["title"],
            "source": item["source"],
            "url": item["link"],
        })
        if len(picked) >= MAX_RESULTS:
            break
    return picked


def main() -> None:
    previous: dict = {}
    if OUTPUT.exists():
        try:
            previous = json.loads(OUTPUT.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError):
            previous = {}

    results = previous.get("results", [])
    error = None
    try:
        fresh = build_results()
        if fresh:  # keep the last good list if a run comes back empty
            results = fresh
    except Exception as exc:
        error = str(exc)

    snapshot = {
        "updatedAt": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "source": "Google News searches for cross country meet results",
        "page": "https://michealsizemore1.github.io/ChatGPT-The-Master-App/cross-country.html",
        "meets": MEETS,
        "results": results,
    }
    if error:
        snapshot["error"] = error

    # Only rewrite the file when the content changed (ignoring the timestamp),
    # so the repo doesn't get a commit every few hours for nothing.
    comparable = {k: v for k, v in snapshot.items() if k != "updatedAt"}
    old = {k: v for k, v in previous.items() if k != "updatedAt"}
    if comparable == old:
        print("XC meets unchanged.")
        return

    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(json.dumps(snapshot, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"Wrote {len(results)} results.")


if __name__ == "__main__":
    main()
