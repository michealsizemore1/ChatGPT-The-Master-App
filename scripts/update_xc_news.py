#!/usr/bin/env python3
"""Refresh the NCAA cross country "News" tab on cross-country.html.

Pulls recent headlines from a public Google News RSS search, keeps the
ones that look like real meet/poll news (as opposed to pure roster or
feature filler), prefers well-known national outlets, and writes them
to data/xc-news.json for the page to fetch at runtime. Meant to run on
a weekly cadence (see .github/workflows/update-xc-news.yml) so the tab
never goes stale again.
"""

from __future__ import annotations

import json
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET
from datetime import datetime, timedelta, timezone
from email.utils import parsedate_to_datetime
from pathlib import Path

QUERY = "NCAA cross country"
RSS_URL = (
    "https://news.google.com/rss/search?q="
    + urllib.parse.quote(QUERY)
    + "&hl=en-US&gl=US&ceid=US:en"
)
OUTPUT = Path(__file__).resolve().parents[1] / "data" / "xc-news.json"
WINDOW_DAYS = 10
MAX_ITEMS = 6
HEADERS = {"User-Agent": "Mozilla/5.0 (compatible; XCNewsUpdater/1.0)"}

NATIONAL_OUTLETS = [
    "letsrun",
    "ustfccca",
    "ncaa.com",
    "flotrack",
    "dyestat",
    "citius mag",
    "track and field news",
    "espn",
    "associated press",
    "sports illustrated",
    "athletic.net",
    "runner's world",
    "cbs sports",
    "usa today",
]
RELEVANT_PATTERN = (
    "invitational",
    "championship",
    "poll",
    "ranked",
    "no. ",
    "nuttycombe",
    "pre-nationals",
    "regional",
    "jamboree",
)


def fetch_items() -> list[dict]:
    request = urllib.request.Request(RSS_URL, headers=HEADERS)
    with urllib.request.urlopen(request, timeout=20) as response:
        root = ET.fromstring(response.read())
    items = []
    for el in root.findall("./channel/item"):
        title = (el.findtext("title") or "").strip()
        link = (el.findtext("link") or "").strip()
        pub_date = (el.findtext("pubDate") or "").strip()
        source = (el.findtext("source") or "").strip()
        if not (title and link and pub_date and source):
            continue
        try:
            published = parsedate_to_datetime(pub_date)
        except (TypeError, ValueError):
            continue
        items.append({"title": title, "link": link, "published": published, "source": source})
    return items


def strip_source_suffix(title: str, source: str) -> str:
    suffix = f" - {source}"
    return title[: -len(suffix)] if title.endswith(suffix) else title


def norm_key(title: str) -> str:
    normalized = "".join(c.lower() if c.isalnum() else " " for c in title)
    return " ".join(normalized.split())[:40]


def is_national(source: str) -> bool:
    lowered = source.lower()
    return any(outlet in lowered for outlet in NATIONAL_OUTLETS)


def priority(title: str, source: str) -> int:
    if is_national(source):
        return 2
    lowered = title.lower()
    if any(pattern in lowered for pattern in RELEVANT_PATTERN):
        return 1
    return 0


def pick(items: list[dict], cap: int, seen: set, source_counts: dict, picked: list, limit: int) -> None:
    for item in items:
        if len(picked) >= limit:
            break
        key = norm_key(item["clean"])
        if key in seen:
            continue
        count = source_counts.get(item["source"], 0)
        if count >= cap:
            continue
        seen.add(key)
        source_counts[item["source"]] = count + 1
        picked.append(item)


def build_news() -> list[list[str]]:
    cutoff = datetime.now(timezone.utc) - timedelta(days=WINDOW_DAYS)
    raw = [item for item in fetch_items() if item["published"] >= cutoff]
    for item in raw:
        item["clean"] = strip_source_suffix(item["title"], item["source"])
        item["prio"] = priority(item["clean"], item["source"])
    raw.sort(key=lambda item: item["published"], reverse=True)

    seen: set = set()
    source_counts: dict = {}
    picked: list = []
    pick([i for i in raw if i["prio"] >= 1], 2, seen, source_counts, picked, MAX_ITEMS)
    pick([i for i in raw if i["prio"] == 0], 1, seen, source_counts, picked, MAX_ITEMS)
    picked.sort(key=lambda item: (item["published"], item["prio"]), reverse=True)

    return [
        [item["published"].astimezone(timezone.utc).strftime("%Y-%m-%d"), item["clean"], item["source"], item["link"], ""]
        for item in picked
    ]


def main() -> None:
    previous: dict = {}
    if OUTPUT.exists():
        try:
            previous = json.loads(OUTPUT.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError):
            previous = {}

    items = previous.get("items", [])
    error = None
    try:
        fresh_items = build_news()
        # Keep the previous snapshot if this run came up emptier than usual
        # (a quiet week or a Google News hiccup shouldn't wipe a good list).
        if len(fresh_items) >= 3:
            items = fresh_items
    except Exception as exc:  # Keep the previous snapshot useful if the feed hiccups.
        error = str(exc)

    snapshot = {
        "updatedAt": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "source": f"Google News search: {QUERY}",
        "items": items,
    }
    if error:
        snapshot["error"] = error

    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(json.dumps(snapshot, indent=2) + "\n", encoding="utf-8")

    if not items:
        raise RuntimeError(f"No news items available to publish; error={error}")


if __name__ == "__main__":
    main()
