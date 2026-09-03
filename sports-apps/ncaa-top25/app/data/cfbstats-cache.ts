export type CachedScoring = { touchdowns: number; fieldGoals: number; extraPoints: number; twoPointConversions: number; safeties: number; points: number };
const cache = {
  "2026|usc|sanjosestate": {
    "selected": {
      "touchdowns": 6,
      "fieldGoals": 0,
      "extraPoints": 6,
      "twoPointConversions": 0,
      "safeties": 0,
      "points": 42
    },
    "opponent": {
      "touchdowns": 3,
      "fieldGoals": 1,
      "extraPoints": 1,
      "twoPointConversions": 2,
      "safeties": 0,
      "points": 26
    },
    "sourceUrl": "https://cfbstats.com/2026/team/657/scoring/offense/gamelog.html",
    "updatedAt": "2026-08-30T20:49:56.712Z"
  }
} as Record<string, { selected: CachedScoring; opponent: CachedScoring; sourceUrl: string; updatedAt: string }>;
export default cache;
