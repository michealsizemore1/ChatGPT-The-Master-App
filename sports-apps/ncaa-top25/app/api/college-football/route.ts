import { NextRequest, NextResponse } from 'next/server';
import cfbStatsCache from '../../data/cfbstats-cache';

const ESPN_BASE = 'https://site.api.espn.com/apis/site/v2/sports/football/college-football';

const decodeHtml = (value: string) => value
  .replace(/&amp;/g, '&').replace(/&#39;/g, "'").replace(/&quot;/g, '"')
  .replace(/&nbsp;/g, ' ').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
const normalizeName = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .toLowerCase().replace(/\bst\.?\b/g, 'state').replace(/[^a-z0-9]/g, '');
const CFB_NAME_ALIASES: Record<string, string> = {
  'Miami': 'Miami (FL)', 'Ole Miss': 'Mississippi', 'Penn State': 'Penn State',
  'SMU': 'Southern Methodist', 'USC': 'USC', 'BYU': 'Brigham Young',
};

type CfbScoring = { touchdowns: number; fieldGoals: number; extraPoints: number; twoPointConversions: number; safeties: number; points: number };

async function resolveCfbStatsId(teamName: string, year: string) {
  const response = await fetch(`https://r.jina.ai/http://cfbstats.com/${year}/team/index.html`, { headers: { Accept: 'text/plain' } });
  if (!response.ok) throw new Error(`CFBStats teams returned ${response.status}`);
  const html = await response.text();
  const wanted = normalizeName(CFB_NAME_ALIASES[teamName] ?? teamName);
  for (const match of html.matchAll(new RegExp(`href=["']/${year}/team/(\\d+)/index\\.html["'][^>]*>([^<]+)`, 'gi'))) {
    if (normalizeName(decodeHtml(match[2])) === wanted) return match[1];
  }
  for (const match of html.matchAll(new RegExp(`\\[([^\\]]+)\\]\\(https?://(?:www\\.)?cfbstats\\.com/${year}/team/(\\d+)/index\\.html\\)`, 'gi'))) {
    if (normalizeName(decodeHtml(match[1])) === wanted) return match[2];
  }
  throw new Error(`CFBStats team not found: ${teamName}`);
}

function parseScoringGame(html: string, opponent: string): CfbScoring | null {
  const wanted = normalizeName(opponent);
  for (const row of html.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)) {
    const cells = [...row[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map(cell => decodeHtml(cell[1]));
    if (cells.length < 10 || !normalizeName(cells[1]).includes(wanted)) continue;
    const values = cells.slice(4, 10).map(value => Number(value));
    if (values.some(value => !Number.isFinite(value))) continue;
    return { touchdowns: values[0], fieldGoals: values[1], extraPoints: values[2], twoPointConversions: values[3], safeties: values[4], points: values[5] };
  }
  for (const line of html.split(/\r?\n/)) {
    if (!line.trim().startsWith('|')) continue;
    const cells = line.split('|').slice(1, -1).map(cell => decodeHtml(cell).replace(/^\[([^\]]+)\]\([^)]+\)$/, '$1').trim());
    if (cells.length < 10 || !normalizeName(cells[1]).includes(wanted)) continue;
    const values = cells.slice(4, 10).map(value => Number(value));
    if (values.some(value => !Number.isFinite(value))) continue;
    return { touchdowns: values[0], fieldGoals: values[1], extraPoints: values[2], twoPointConversions: values[3], safeties: values[4], points: values[5] };
  }
  return null;
}

async function getCfbStatsScoring(teamName: string, opponent: string, year: string) {
  const cached = cfbStatsCache[`${year}|${normalizeName(teamName)}|${normalizeName(opponent)}`];
  if (cached) return { source: 'CFBStats', teamId: 'cached', ...cached };
  const teamId = await resolveCfbStatsId(teamName, year);
  const base = `https://r.jina.ai/http://cfbstats.com/${year}/team/${teamId}/scoring`;
  const [offenseResponse, defenseResponse] = await Promise.all([
    fetch(`${base}/offense/gamelog.html`, { headers: { Accept: 'text/plain' } }),
    fetch(`${base}/defense/gamelog.html`, { headers: { Accept: 'text/plain' } }),
  ]);
  if (!offenseResponse.ok || !defenseResponse.ok) throw new Error('CFBStats scoring logs unavailable');
  const [offenseHtml, defenseHtml] = await Promise.all([offenseResponse.text(), defenseResponse.text()]);
  return { source: 'CFBStats', teamId, selected: parseScoringGame(offenseHtml, opponent), opponent: parseScoringGame(defenseHtml, opponent) };
}

export async function GET(request: NextRequest) {
  const cfbStatsTeam = request.nextUrl.searchParams.get('cfbStatsTeam');
  if (cfbStatsTeam) {
    const opponent = request.nextUrl.searchParams.get('opponent') ?? '';
    const year = request.nextUrl.searchParams.get('year') ?? '2026';
    if (!opponent) return NextResponse.json({ error: 'Opponent is required for CFBStats scoring.' }, { status: 400 });
    try {
      const scoring = await getCfbStatsScoring(cfbStatsTeam, opponent, year);
      if (!scoring.selected || !scoring.opponent) return NextResponse.json({ error: 'The requested CFBStats game was not found.' }, { status: 404 });
      return NextResponse.json(scoring, { headers: { 'Cache-Control': 'public, max-age=300, stale-while-revalidate=3600' } });
    } catch {
      return NextResponse.json({ error: 'CFBStats backup is temporarily unavailable.' }, { status: 502 });
    }
  }
  const cfbdTeam = request.nextUrl.searchParams.get('cfbdTeam');
  if (cfbdTeam) {
    const apiKey = process.env.CFBD_API_KEY;
    if (!apiKey) return NextResponse.json({ error: 'CFBD backup is not configured.' }, { status: 503 });
    const year = request.nextUrl.searchParams.get('year') ?? '2026';
    const week = request.nextUrl.searchParams.get('week');
    const query = new URLSearchParams({ year, team: cfbdTeam });
    if (week) query.set('week', week);
    try {
      const headers = { Authorization: `Bearer ${apiKey}`, Accept: 'application/json' };
      const [teamResponse, playerResponse] = await Promise.all([
        fetch(`https://api.collegefootballdata.com/games/teams?${query}`, { headers }),
        fetch(`https://api.collegefootballdata.com/games/players?${query}`, { headers }),
      ]);
      if (!teamResponse.ok) return NextResponse.json({ error: 'CFBD request was rejected.', upstreamStatus: teamResponse.status }, { status: 502 });
      return NextResponse.json({
        source: 'CollegeFootballData',
        teamStats: await teamResponse.json(),
        playerStats: playerResponse.ok ? await playerResponse.json() : [],
      }, { headers: { 'Cache-Control': 'private, max-age=300' } });
    } catch {
      return NextResponse.json({ error: 'CFBD backup is temporarily unavailable.' }, { status: 502 });
    }
  }
  const gameId = request.nextUrl.searchParams.get('gameId');
  const teamId = request.nextUrl.searchParams.get('teamId');
  const scheduleTeamId = request.nextUrl.searchParams.get('scheduleTeamId');
  const start = request.nextUrl.searchParams.get('start');
  const end = request.nextUrl.searchParams.get('end');
  const endpoint = gameId
    ? `${ESPN_BASE}/summary?event=${encodeURIComponent(gameId)}`
    : scheduleTeamId
      ? `${ESPN_BASE}/teams/${encodeURIComponent(scheduleTeamId)}/schedule?season=2026`
    : teamId
      ? `${ESPN_BASE}/teams/${encodeURIComponent(teamId)}/statistics`
    : `${ESPN_BASE}/scoreboard?groups=80&limit=200${start&&end?`&dates=${encodeURIComponent(start)}-${encodeURIComponent(end)}`:''}`;
  try {
    const response = await fetch(endpoint, { cache: 'no-store', headers: { Accept: 'application/json' } });
    if (!response.ok) throw new Error(`ESPN returned ${response.status}`);
    return NextResponse.json(await response.json(), {
      headers: { 'Cache-Control': `public, max-age=${gameId ? 30 : 60}, stale-while-revalidate=120` },
    });
  } catch {
    return NextResponse.json({ error: 'Live college football data is temporarily unavailable.' }, { status: 502 });
  }
}
