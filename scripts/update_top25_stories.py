#!/usr/bin/env python3
"""Refresh the "Top stories" field notes shown on the Saturday Top 25 page.

Builds story blurbs straight from ESPN's public scoreboard for any completed
FBS game that involved a ranked (AP Top 25) team -- no manual curation
needed. Meant to run on a weekly cadence (see
.github/workflows/update-top25-stories.yml) so the page never goes stale
again.
"""

from __future__ import annotations

import json
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

SCOREBOARD_URL = (
    "https://site.api.espn.com/apis/site/v2/sports/football/college-football/"
    "scoreboard?groups=80&limit=100"
)
OUTPUT = Path(__file__).resolve().parents[1] / "data" / "top25-stories.json"
MAX_STORIES = 9
HEADERS = {
    "User-Agent": "Mozilla/5.0 (compatible; Top25-StoriesUpdater/1.0)",
    "Accept": "application/json",
}


def fetch_json(url: str) -> dict:
    request = urllib.request.Request(url, headers=HEADERS)
    with urllib.request.urlopen(request, timeout=20) as response:
        return json.load(response)


def ranked(competitor: dict) -> int | None:
    rank = (competitor.get("curatedRank") or {}).get("current")
    return rank if rank and rank <= 25 else None


def rank_prefix(team: dict) -> str:
    return f"No. {team['rank']} {team['name']}" if team["rank"] else team["name"]


def classify(game: dict) -> str:
    winner, loser = game["winner"], game["loser"]
    upset = loser["rank"] and (not winner["rank"] or winner["rank"] > loser["rank"])
    diff = winner["score"] - loser["score"]
    overtime = bool(game.get("periods") and game["periods"] > 4)
    if upset:
        return "Upset alert"
    if overtime:
        return "Overtime thriller"
    if diff >= 30:
        return "Blowout win"
    if winner["rank"] == 1:
        return "Poll leader delivers"
    if diff <= 3:
        return "Nailbiter"
    return "Top 25 result"


def verb(tag: str) -> str:
    return {
        "Upset alert": "stuns",
        "Blowout win": "rolls past",
        "Overtime thriller": "outlasts",
        "Nailbiter": "survives",
    }.get(tag, "tops")


def build_games(payload: dict) -> list[dict]:
    games: list[dict] = []
    for event in payload.get("events", []):
        status = event.get("status", {}).get("type", {})
        if not status.get("completed"):
            continue
        competitions = event.get("competitions") or []
        if not competitions:
            continue
        competition = competitions[0]
        competitors = competition.get("competitors") or []
        winner = next((c for c in competitors if c.get("winner") is True), None)
        loser = next((c for c in competitors if c.get("winner") is False), None)
        if not winner or not loser:
            continue
        try:
            winner_score = int(winner.get("score"))
            loser_score = int(loser.get("score"))
        except (TypeError, ValueError):
            continue
        game = {
            "date": event.get("date"),
            "periods": competition.get("status", {}).get("period"),
            "winner": {
                "name": winner.get("team", {}).get("location") or winner.get("team", {}).get("displayName"),
                "score": winner_score,
                "rank": ranked(winner),
            },
            "loser": {
                "name": loser.get("team", {}).get("location") or loser.get("team", {}).get("displayName"),
                "score": loser_score,
                "rank": ranked(loser),
            },
        }
        if game["winner"]["rank"] or game["loser"]["rank"]:
            games.append(game)
    return games


def best_rank(game: dict) -> int:
    return min(game["winner"]["rank"] or 99, game["loser"]["rank"] or 99)


def build_stories(games: list[dict]) -> list[list[str]]:
    # Highest-ranked matchups lead; within a tie, the most recently played game wins.
    games = sorted(games, key=lambda g: g.get("date") or "", reverse=True)
    games.sort(key=best_rank)
    stories: list[list[str]] = []
    for game in games[:MAX_STORIES]:
        tag = classify(game)
        overtime_suffix = " in overtime" if game.get("periods") and game["periods"] > 4 else ""
        title = (
            f"{rank_prefix(game['winner'])} {verb(tag)} {rank_prefix(game['loser'])}, "
            f"{game['winner']['score']}-{game['loser']['score']}{overtime_suffix}"
        )
        stories.append([tag, title])
    return stories


def main() -> None:
    previous: dict = {}
    if OUTPUT.exists():
        try:
            previous = json.loads(OUTPUT.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError):
            previous = {}

    stories = previous.get("stories", [])
    error = None
    try:
        payload = fetch_json(SCOREBOARD_URL)
        games = build_games(payload)
        fresh_stories = build_stories(games)
        # Only replace last week's stories once there's enough new material
        # (a bye week or early-week run can otherwise wipe a good list).
        if len(fresh_stories) >= 3:
            stories = fresh_stories
    except Exception as exc:  # Keep the previous snapshot useful if ESPN hiccups.
        error = str(exc)

    snapshot = {
        "updatedAt": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "source": "ESPN college football scoreboard",
        "stories": stories,
    }
    if error:
        snapshot["error"] = error

    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(json.dumps(snapshot, indent=2) + "\n", encoding="utf-8")

    if not stories:
        raise RuntimeError(f"No stories available to publish; error={error}")


if __name__ == "__main__":
    main()
