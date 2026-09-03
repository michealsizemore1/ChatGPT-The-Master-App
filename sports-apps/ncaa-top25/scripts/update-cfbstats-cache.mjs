import fs from 'node:fs/promises';
const year=process.argv[2]||'2026';
const teams=['Ohio State','Oregon','Georgia','Notre Dame','Texas','Indiana','Miami (FL)','Texas A&M','Mississippi','Oklahoma','LSU','Texas Tech','Alabama','Brigham Young','USC','Michigan','Washington','Penn State','Southern Methodist','Tennessee','Utah','Iowa','Houston','Louisville','Missouri'];
const norm=value=>value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/\bst\.?\b/g,'state').replace(/[^a-z0-9]/g,'');
const clean=value=>value.replace(/^\[([^\]]+)\]\([^)]+\)$/,'$1').trim();
const get=async path=>{const response=await fetch(`https://r.jina.ai/http://cfbstats.com${path}`);if(!response.ok)throw new Error(`${response.status} ${path}`);return response.text()};
const index=await get(`/${year}/team/index.html`),ids={};
for(const match of index.matchAll(new RegExp(`\\[([^\\]]+)\\]\\(https?://(?:www\\.)?cfbstats\\.com/${year}/team/(\\d+)/index\\.html\\)`,'gi')))ids[norm(match[1])]=match[2];
const parse=text=>text.split(/\r?\n/).filter(line=>line.trim().startsWith('|')).map(line=>line.split('|').slice(1,-1).map(clean)).filter(cells=>cells.length>=10&&/^\d{2}\/\d{2}\/\d{2}$/.test(cells[0])).map(cells=>({opponent:cells[1],values:{touchdowns:+cells[4],fieldGoals:+cells[5],extraPoints:+cells[6],twoPointConversions:+cells[7],safeties:+cells[8],points:+cells[9]}}));
const cache={};
for(const team of teams){const id=ids[norm(team)];if(!id)continue;try{const [offense,defense]=await Promise.all([get(`/${year}/team/${id}/scoring/offense/gamelog.html`),get(`/${year}/team/${id}/scoring/defense/gamelog.html`)]);for(const row of parse(offense)){const opponent=parse(defense).find(item=>norm(item.opponent)===norm(row.opponent));if(opponent)cache[`${year}|${norm(team)}|${norm(row.opponent)}`]={selected:row.values,opponent:opponent.values,sourceUrl:`https://cfbstats.com/${year}/team/${id}/scoring/offense/gamelog.html`,updatedAt:new Date().toISOString()}}}catch(error){console.warn(`Skipped ${team}: ${error.message}`)}}
const output=`export type CachedScoring = { touchdowns: number; fieldGoals: number; extraPoints: number; twoPointConversions: number; safeties: number; points: number };\nconst cache = ${JSON.stringify(cache,null,2)} as Record<string, { selected: CachedScoring; opponent: CachedScoring; sourceUrl: string; updatedAt: string }>;\nexport default cache;\n`;
await fs.writeFile(new URL('../app/data/cfbstats-cache.ts',import.meta.url),output);console.log(`Saved ${Object.keys(cache).length} completed Top 25 game records.`);
