#!/usr/bin/env python3
"""Build data/tf-news.json for the Track & Field Android widget's Latest News.

Collects recent college track & field headlines from public Google News RSS
searches (same approach as update_xc_meets.py), drops high school coverage
and cross-country-only stories, and keeps the newest few. Runs every 6 hours
via .github/workflows/update-tf-news.yml.
"""

from __future__ import annotations

import json
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from update_xc_meets import HIGH_SCHOOL_WORDS, fetch  # noqa: E402
from update_xc_news import norm_key  # noqa: E402

OUTPUT = Path(__file__).resolve().parents[1] / "data" / "tf-news.json"
WINDOW_DAYS = 21
MAX_ITEMS = 12
MAX_PER_SOURCE = 3

QUERIES = [
    "NCAA track and field",
    "college track and field",
    "NCAA indoor track and field 2027",
    "USTFCCCA track and field",
]

TF_WORDS = ("track and field", "track & field", "track & cross", "t&f", "indoor season",
            "outdoor season", "ncaa indoor", "ncaa outdoor", "ustfccca", "hayward field",
            "sprinter", "hurdler", "collegiate record")
SKIP_WORDS = ("cross country championship", "xc championship", "obituary", "tickets on sale")


def keep(title: str, source: str) -> bool:
    t = " " + title.lower()
    s = source.lower()
    if not any(w in t for w in TF_WORDS):
        return False
    if "cross country" in t and "track" not in t:
        return False
    if any(w in t for w in SKIP_WORDS):
        return False
    if any(w in t or w in s for w in HIGH_SCHOOL_WORDS):
        return False
    return True


def build() -> list[dict]:
    cutoff = datetime.now(timezone.utc) - timedelta(days=WINDOW_DAYS)
    pool: list[dict] = []
    for q in QUERIES:
        try:
            pool += fetch(q)
        except Exception as exc:  # one bad query shouldn't sink the rest
            print(f"query failed: {q!r}: {exc}", file=sys.stderr)
    pool = [i for i in pool if i["published"] >= cutoff and keep(i["title"], i["source"])]
    pool.sort(key=lambda i: i["published"], reverse=True)

    seen: set = set()
    per_source: dict = {}
    picked: list[dict] = []
    for item in pool:
        key = norm_key(item["title"])
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
        if len(picked) >= MAX_ITEMS:
            break
    return picked


def main() -> None:
    previous: dict = {}
    if OUTPUT.exists():
        try:
            previous = json.loads(OUTPUT.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError):
            previous = {}

    items = previous.get("news", [])
    error = None
    try:
        fresh = build()
        if fresh:  # keep the last good list if a run comes back empty
            items = fresh
    except Exception as exc:
        error = str(exc)

    snapshot = {
        "updatedAt": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "source": "Google News searches for college track & field",
        "news": items,
    }
    if error:
        snapshot["error"] = error

    comparable = {k: v for k, v in snapshot.items() if k != "updatedAt"}
    old = {k: v for k, v in previous.items() if k != "updatedAt"}
    if comparable == old:
        print("TF news unchanged.")
        return

    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(json.dumps(snapshot, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"Wrote {len(items)} news items.")


if __name__ == "__main__":
    main()
