import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const ESPN = 'https://site.api.espn.com/apis/site/v2/sports/football/nfl';

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const gameId = params.get('gameId');
  const teamId = params.get('teamId');
  const seasonType = params.get('seasonType') || '2';
  if (!gameId && !teamId) return NextResponse.json({ error: 'Missing gameId or teamId' }, { status: 400 });
  const url = gameId
    ? `${ESPN}/summary?event=${encodeURIComponent(gameId)}`
    : `${ESPN}/teams/${encodeURIComponent(teamId!)}/schedule?season=2026&seasontype=${encodeURIComponent(seasonType)}`;
  try {
    const response = await fetch(url, { cache: 'no-store', headers: { Accept: 'application/json' } });
    if (!response.ok) return NextResponse.json({ error: 'NFL data unavailable' }, { status: response.status });
    return NextResponse.json(await response.json(), { headers: { 'Cache-Control': 'no-store, max-age=0' } });
  } catch {
    return NextResponse.json({ error: 'NFL data unavailable' }, { status: 502 });
  }
}
