'use client';
import { useEffect, useMemo, useState } from 'react';

const mountainTime=(date:Date)=>date.toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit',timeZone:'America/Denver'});

const teams=[
 {rank:1,name:'Ohio State',abbr:'OSU',espnId:'194',record:'0–0',prev:1,points:1672,pf:'—',pa:'—',ypg:'—',color:'#ba0c2f'},
 {rank:2,name:'Oregon',abbr:'ORE',espnId:'2483',record:'0–0',prev:2,points:1597,pf:'—',pa:'—',ypg:'—',color:'#154733'},
 {rank:3,name:'Georgia',abbr:'UGA',espnId:'61',record:'0–0',prev:3,points:1513,pf:'—',pa:'—',ypg:'—',color:'#ba0c2f'},
 {rank:4,name:'Notre Dame',abbr:'ND',espnId:'87',record:'0–0',prev:4,points:1510,pf:'—',pa:'—',ypg:'—',color:'#0c2340'},
 {rank:5,name:'Texas',abbr:'TEX',espnId:'251',record:'0–0',prev:5,points:1483,pf:'—',pa:'—',ypg:'—',color:'#bf5700'},
 {rank:6,name:'Indiana',abbr:'IND',espnId:'84',record:'0–0',prev:6,points:1440,pf:'—',pa:'—',ypg:'—',color:'#990000'},
 {rank:7,name:'Miami',abbr:'MIA',espnId:'2390',record:'0–0',prev:7,points:1379,pf:'—',pa:'—',ypg:'—',color:'#f47321'},
 {rank:8,name:'Texas A&M',abbr:'TAMU',espnId:'245',record:'0–0',prev:8,points:1131,pf:'—',pa:'—',ypg:'—',color:'#500000'},
 {rank:9,name:'Ole Miss',abbr:'MISS',espnId:'145',record:'0–0',prev:9,points:1102,pf:'—',pa:'—',ypg:'—',color:'#ce1126'},
 {rank:10,name:'Oklahoma',abbr:'OU',espnId:'201',record:'0–0',prev:10,points:1047,pf:'—',pa:'—',ypg:'—',color:'#841617'},
 {rank:11,name:'LSU',abbr:'LSU',espnId:'99',record:'0–0',prev:11,points:988,pf:'—',pa:'—',ypg:'—',color:'#461d7c'},
 {rank:12,name:'Texas Tech',abbr:'TTU',espnId:'2641',record:'0–0',prev:12,points:983,pf:'—',pa:'—',ypg:'—',color:'#cc0000'},
 {rank:13,name:'Alabama',abbr:'ALA',espnId:'333',record:'0–0',prev:13,points:904,pf:'—',pa:'—',ypg:'—',color:'#9e1b32'},
 {rank:14,name:'BYU',abbr:'BYU',espnId:'252',record:'0–0',prev:14,points:839,pf:'—',pa:'—',ypg:'—',color:'#002e5d'},
 {rank:15,name:'USC',abbr:'USC',espnId:'30',record:'0–0',prev:15,points:839,pf:'—',pa:'—',ypg:'—',color:'#990000'},
 {rank:16,name:'Michigan',abbr:'MICH',espnId:'130',record:'0–0',prev:16,points:718,pf:'—',pa:'—',ypg:'—',color:'#00274c'},
 {rank:17,name:'Washington',abbr:'WASH',espnId:'264',record:'0–0',prev:17,points:501,pf:'—',pa:'—',ypg:'—',color:'#4b2e83'},
 {rank:18,name:'Penn State',abbr:'PSU',espnId:'213',record:'0–0',prev:18,points:482,pf:'—',pa:'—',ypg:'—',color:'#041e42'},
 {rank:19,name:'SMU',abbr:'SMU',espnId:'2567',record:'0–0',prev:19,points:434,pf:'—',pa:'—',ypg:'—',color:'#c8102e'},
 {rank:20,name:'Tennessee',abbr:'TENN',espnId:'2633',record:'0–0',prev:20,points:394,pf:'—',pa:'—',ypg:'—',color:'#ff8200'},
 {rank:21,name:'Utah',abbr:'UTAH',espnId:'254',record:'0–0',prev:21,points:304,pf:'—',pa:'—',ypg:'—',color:'#cc0000'},
 {rank:22,name:'Iowa',abbr:'IOWA',espnId:'2294',record:'0–0',prev:22,points:260,pf:'—',pa:'—',ypg:'—',color:'#000000'},
 {rank:23,name:'Houston',abbr:'HOU',espnId:'248',record:'0–0',prev:23,points:252,pf:'—',pa:'—',ypg:'—',color:'#c8102e'},
 {rank:24,name:'Louisville',abbr:'LOU',espnId:'97',record:'0–0',prev:24,points:194,pf:'—',pa:'—',ypg:'—',color:'#ad0000'},
 {rank:25,name:'Missouri',abbr:'MIZ',espnId:'142',record:'0–0',prev:25,points:117,pf:'—',pa:'—',ypg:'—',color:'#000000'}
];
const stories=[
 ['Poll leader','Ohio State opens at No. 1 with 40 first-place votes'],
 ['Highest ever','Oregon earns its highest preseason ranking at No. 2'],
 ['Champion watch','Defending national champion Indiana begins at No. 6'],
 ['Irish rising','Notre Dame earns its highest preseason ranking since 2006'],
 ['Conference watch','The SEC leads all conferences with nine ranked teams'],
 ['Big 12 favorite','Conference champion Texas Tech leads the Big 12 at No. 12'],
 ['ACC trio','Miami, SMU and Louisville represent the ACC in the Top 25'],
 ['Back in the poll','No. 23 Houston earns its first preseason ranking in four years'],
 ['Big Ten streak','The Big Ten enters 2026 after winning three straight CFP titles']
];
const teamStats=[
 ['Third-down conversion %','Drive sustainability and the ability to keep the offense on the field.'],
 ['Red-zone scoring %','How efficiently trips inside the 20 become points—and touchdowns.'],
 ['Turnover margin','Takeaways minus lost fumbles and interceptions; a direct measure of control.'],
 ['Yards per play','A clearer view of offensive explosiveness and defensive containment.'],
 ['Time of possession','Clock control that can keep a defense rested and an opponent waiting.'],
 ['Scoring offense','Points per game and the definitive measure of putting points on the board.'],
 ['Scoring defense','Points allowed per game and the unit’s ability to finish possessions.'],
 ['Passing efficiency defense','Completion rate, yards per attempt, touchdowns allowed and interceptions forced.'],
 ['Rushing yards per game','Line dominance and the ability to run—or stop the run.'],
 ['Penalties per game','Discipline, focus and the cost of self-inflicted mistakes.'],
];
const playerStats=[
 ['Passing yards','The core volume measure for elite quarterbacks.'],
 ['Total QBR','ESPN’s 0–100 comprehensive quarterback efficiency metric.'],
 ['Rushing yards','Individual running back and mobile-quarterback productivity.'],
 ['Yards per reception','A quick read on explosive receivers and deep threats.'],
 ['Completion percentage','Passing accuracy, decision-making and efficiency.'],
 ['Sacks','The premier box-score measure of front-seven disruption.'],
 ['Interceptions / passes defended','Coverage impact and the ability to deny throws or force turnovers.'],
 ['Total / solo tackles','A linebacker’s or safety’s range and reliability in stopping the run.'],
 ['Total touchdowns','Passing, rushing and receiving scores combined into one impact measure.'],
 ['PFF player grade','Snap-by-snap evaluation beyond what a traditional box score captures.'],
];
const metricHints:Record<string,string[]>= {
 'Third-down conversion %':['third down efficiency','third down percentage','thirddowns'],
 'Red-zone scoring %':['red zone efficiency','red zone percentage','redzone'],
 'Turnover margin':['turnover margin','turnovers'],
 'Yards per play':['yards per play','total yards'],
 'Time of possession':['possession time','time of possession'],
 'Scoring offense':['points per game','total points','points'],
 'Scoring defense':['points allowed','opponent points'],
 'Passing efficiency defense':['pass efficiency','opponent pass'],
 'Rushing yards per game':['rushing yards','rush yards'],
 'Penalties per game':['penalties'],
};
type ScheduleGame={id:string;date:string;opponent:string;venue:'vs'|'at';neutral:boolean;state:'pre'|'in'|'post';status:string;network:string;ownScore:string;opponentScore:string};
type LiveTeam={id:string;name:string;abbr:string;rank?:number;score:string;color:string;logo?:string;homeAway?:'home'|'away';record?:string};
type LiveGame={id:string;date:string;status:string;state:'pre'|'in'|'post';network:string;teams:LiveTeam[]};
type GameStat={name:string;away:string;home:string};
type PlayerLeader={teamId:string;category:string;name:string;value:string};
type ScoringBreakdown={touchdowns:number;fieldGoals:number;extraPoints:number;twoPointConversions:number;safeties:number;points:number};
type GameDetails={headline:string;teams:LiveTeam[];stats:GameStat[];lastPlay?:string;highlights?:{headline:string;url:string}[];touchdowns?:[number,number];fieldGoals?:[number,number];extraPoints?:[number,number];twoPointConversions?:[number,number];safeties?:[number,number];scoringVerified?:[boolean,boolean];scoringSource?:string;scoringSourceUrl?:string;scoringUpdatedAt?:string;quarterScores?:{team:string;scores:string[]}[];leaders?:PlayerLeader[]};

const rankedIds=new Set(teams.map(team=>team.espnId));
const conferenceOrder=['ACC','Big Ten','Big 12','SEC','Independent'];
const conferenceById:Record<string,string>={'2390':'ACC','2567':'ACC','97':'ACC','194':'Big Ten','2483':'Big Ten','84':'Big Ten','30':'Big Ten','130':'Big Ten','264':'Big Ten','213':'Big Ten','2294':'Big Ten','2641':'Big 12','252':'Big 12','254':'Big 12','248':'Big 12','61':'SEC','251':'SEC','245':'SEC','145':'SEC','201':'SEC','99':'SEC','333':'SEC','2633':'SEC','142':'SEC','87':'Independent'};
const conferenceOf=(team:(typeof teams)[number])=>conferenceById[team.espnId]??'Independent';
const normalizeGame=(event:any):LiveGame=>{
 const competition=event.competitions?.[0]??{};
 const competitors=[...(competition.competitors??[])].sort((a:any,b:any)=>a.homeAway==='away'?-1:b.homeAway==='away'?1:0);
 return {id:event.id,date:event.date,status:event.status?.type?.shortDetail??'Scheduled',state:event.status?.type?.state??'pre',network:competition.broadcasts?.[0]?.names?.[0]??'',teams:competitors.map((entry:any)=>({id:entry.team?.id,name:entry.team?.shortDisplayName??entry.team?.displayName,abbr:entry.team?.abbreviation??'',rank:entry.curatedRank?.current<99?entry.curatedRank.current:undefined,score:String(entry.score?.displayValue??entry.score?.value??entry.score??'0'),color:`#${entry.team?.color??'10231d'}`,logo:entry.team?.logo,homeAway:entry.homeAway,record:entry.records?.find((record:any)=>record.type==='total'||record.name==='overall')?.summary}))};
};
const normalizeScheduleGame=(event:any,team:typeof teams[number]):ScheduleGame=>{
 const competition=event.competitions?.[0]??{};
 const own=competition.competitors?.find((entry:any)=>String(entry.team?.id)===team.espnId);
 const opponent=competition.competitors?.find((entry:any)=>String(entry.team?.id)!==team.espnId);
 const gameStatus=competition.status??event.status;
 const providerState=gameStatus?.type?.state??'pre';
 const hasPostedScore=(competition.competitors??[]).some((entry:any)=>Number(entry.score?.value??entry.score)>0);
 const inferredComplete=providerState==='post'||(hasPostedScore&&new Date(event.date).getTime()<Date.now());
 return {id:String(event.id),date:event.date,opponent:opponent?.team?.shortDisplayName??'Opponent TBD',venue:own?.homeAway==='away'?'at':'vs',neutral:Boolean(competition.neutralSite),state:inferredComplete?'post':providerState,status:inferredComplete?'Final':gameStatus?.type?.shortDetail??'Scheduled',network:competition.broadcasts?.[0]?.names?.[0]??competition.broadcasts?.[0]?.media?.shortName??'',ownScore:String(own?.score?.displayValue??own?.score?.value??own?.score??'—'),opponentScore:String(opponent?.score?.displayValue??opponent?.score?.value??opponent?.score??'—')};
};

export default function Home(){
 const [section,setSection]=useState('Overview');
 const [selected,setSelected]=useState('OSU');
 const [query,setQuery]=useState('');
 const [expanded,setExpanded]=useState<string|null>(null);
 const [schedules,setSchedules]=useState<Record<string,ScheduleGame[]>>({});
 const [scheduleLoading,setScheduleLoading]=useState<string|null>(null);
 const [scheduleError,setScheduleError]=useState<string|null>(null);
 const [liveGames,setLiveGames]=useState<LiveGame[]>([]);
 const [weeklyGames,setWeeklyGames]=useState<LiveGame[]>([]);
 const [liveError,setLiveError]=useState(false);
 const [lastUpdated,setLastUpdated]=useState<Date|null>(null);
 const [selectedGameId,setSelectedGameId]=useState<string|null>(null);
 const [gameDetails,setGameDetails]=useState<GameDetails|null>(null);
 const [detailsLoading,setDetailsLoading]=useState(false);
 const [expandedGameId,setExpandedGameId]=useState<string|null>(null);
 const [legacyDetails,setLegacyDetails]=useState<Record<string,GameDetails>>({});
 const [legacyLoading,setLegacyLoading]=useState<string|null>(null);
 const [metricView,setMetricView]=useState<'team'|'player'>('team');
 const [metricValues,setMetricValues]=useState<Record<string,Record<string,string>>>({});
 const filtered=useMemo(()=>teams.filter(t=>t.name.toLowerCase().includes(query.toLowerCase())).sort((a,b)=>conferenceOrder.indexOf(conferenceOf(a))-conferenceOrder.indexOf(conferenceOf(b))||a.rank-b.rank),[query]);
 const active=teams.find(t=>t.abbr===selected)??teams[0];
 const visibleGames=useMemo(()=>liveGames.filter(game=>game.teams.some(team=>rankedIds.has(team.id))).slice(0,4),[liveGames]);
 const weeklyScores=useMemo(()=>{const result:Record<string,string>={};weeklyGames.forEach(game=>game.teams.forEach(team=>{if(!rankedIds.has(team.id))return;const opponent=game.teams.find(entry=>entry.id!==team.id);if(!opponent)return;const prefix=team.homeAway==='away'?'AT':'VS';result[team.id]=game.state==='pre'?`${prefix} ${opponent.name} · ${mountainTime(new Date(game.date))} MT · ${game.network||'TV TBD'}`:`${prefix} ${opponent.name} · ${team.score}–${opponent.score} ${game.state==='in'?'LIVE':'FINAL'}`}));return result},[weeklyGames]);
 const currentRecords=useMemo(()=>{const result:Record<string,string>={};weeklyGames.forEach(game=>game.teams.forEach(team=>{if(team.record)result[team.id]=team.record.replace('-', '–')}));return result},[weeklyGames]);
 useEffect(()=>{
  let cancelled=false;
  const loadScores=async()=>{
   try{
    let response=await fetch('/api/college-football',{cache:'no-store'});
    if(!response.ok) response=await fetch('https://site.api.espn.com/apis/site/v2/sports/football/college-football/scoreboard?groups=80&limit=100',{cache:'no-store'});
    if(!response.ok)throw new Error('Scores unavailable');
    const data=await response.json();
    if(cancelled)return;
    const games=(data.events??[]).map(normalizeGame).sort((a:LiveGame,b:LiveGame)=>a.state==='in'?-1:b.state==='in'?1:new Date(a.date).getTime()-new Date(b.date).getTime());
    setLiveGames(games);setLiveError(false);setLastUpdated(new Date());
   }catch{if(!cancelled)setLiveError(true)}
  };
  loadScores();const timer=window.setInterval(loadScores,120000);
  const onVisible=()=>{if(document.visibilityState==='visible')loadScores()};
  document.addEventListener('visibilitychange',onVisible);
  return()=>{cancelled=true;window.clearInterval(timer);document.removeEventListener('visibilitychange',onVisible)};
 },[]);
 useEffect(()=>{
  let cancelled=false;
  Promise.all(teams.map(async team=>{try{const response=await fetch(`/api/college-football?scheduleTeamId=${encodeURIComponent(team.espnId)}&fresh=${Date.now()}`,{cache:'no-store'});if(!response.ok)return null;const data=await response.json();return [team.abbr,(data.events??[]).map((event:any)=>normalizeScheduleGame(event,team))] as const}catch{return null}})).then(entries=>{if(!cancelled)setSchedules(current=>({...current,...Object.fromEntries(entries.filter(Boolean) as [string,ScheduleGame[]][])}))});
  return()=>{cancelled=true};
 },[]);
 useEffect(()=>{
  let cancelled=false;
  const loadWeek=async()=>{
   const now=new Date(),start=new Date(now);start.setHours(0,0,0,0);start.setDate(start.getDate()-((start.getDay()+6)%7));const end=new Date(start);end.setDate(end.getDate()+7);
   const stamp=(date:Date)=>`${date.getFullYear()}${String(date.getMonth()+1).padStart(2,'0')}${String(date.getDate()).padStart(2,'0')}`;
   try{const dates=`${stamp(start)}-${stamp(end)}`;let response=await fetch(`/api/college-football?start=${stamp(start)}&end=${stamp(end)}&fresh=${Date.now()}`,{cache:'no-store'});if(!response.ok)response=await fetch(`https://site.api.espn.com/apis/site/v2/sports/football/college-football/scoreboard?groups=80&limit=200&dates=${dates}`,{cache:'no-store'});if(!response.ok)throw new Error('Week unavailable');const data=await response.json();if(!cancelled)setWeeklyGames((data.events??[]).map(normalizeGame))}catch{if(!cancelled)setWeeklyGames([])}
  };
  loadWeek();const timer=window.setInterval(loadWeek,120000);return()=>{cancelled=true;window.clearInterval(timer)};
 },[]);
 useEffect(()=>{
  if(!selectedGameId){setGameDetails(null);return}
  let cancelled=false;setDetailsLoading(true);
  const loadDetails=async()=>{
   try{
    let response=await fetch(`/api/college-football?gameId=${encodeURIComponent(selectedGameId)}`,{cache:'no-store'});
    if(!response.ok)response=await fetch(`https://site.api.espn.com/apis/site/v2/sports/football/college-football/summary?event=${encodeURIComponent(selectedGameId)}`,{cache:'no-store'});
    if(!response.ok)throw new Error('Details unavailable');
    const data=await response.json();if(cancelled)return;
    const rows=new Map<string,GameStat>();
    (data.boxscore?.teams??[]).forEach((team:any,index:number)=>(team.statistics??[]).forEach((stat:any)=>{
     const row=rows.get(stat.name)??{name:stat.label??stat.name,away:'—',home:'—'};
     if(index===0)row.away=stat.displayValue??'—';else row.home=stat.displayValue??'—';rows.set(stat.name,row);
    }));
    setGameDetails({headline:data.header?.competitions?.[0]?.status?.type?.detail??'',teams:normalizeGame(data.header).teams,stats:[...rows.values()].slice(0,10),lastPlay:data.plays?.at?.(-1)?.text});
   }catch{if(!cancelled)setGameDetails(null)}finally{if(!cancelled)setDetailsLoading(false)}
  };
  loadDetails();const timer=window.setInterval(loadDetails,120000);
  return()=>{cancelled=true;window.clearInterval(timer)};
 },[selectedGameId]);
 useEffect(()=>{
  let cancelled=false;
  const loadTeamStats=async()=>{
   const entries=await Promise.all(teams.map(async team=>{
    try{const response=await fetch(`/api/college-football?teamId=${team.espnId}`,{cache:'no-store'});if(response.ok){const data=await response.json();const stats:any[] = data.results??data.statistics??data.stats??[];const values:Record<string,string>={};(Array.isArray(stats)?stats:Object.values(stats).flat()).forEach((stat:any)=>{const value=stat.displayValue??stat.value??stat.perGame??stat.percentage;if(value!=null)values[String(stat.name??stat.label??'').toLowerCase()]=String(value)});if(Object.keys(values).length)return [team.abbr,values] as const}
     const direct=await fetch(`https://site.api.espn.com/apis/site/v2/sports/football/college-football/teams/${team.espnId}/statistics`,{cache:'no-store'});
     if(direct.ok){const data=await direct.json();const stats:any[]=data.results??data.statistics??data.stats??[];const values:Record<string,string>={};(Array.isArray(stats)?stats:Object.values(stats).flat()).forEach((stat:any)=>{const value=stat.displayValue??stat.value??stat.perGame??stat.percentage;if(value!=null)values[String(stat.name??stat.label??'').toLowerCase()]=String(value)});if(Object.keys(values).length)return [team.abbr,values] as const}
     const completed=liveGames.find(game=>game.state==='post'&&game.teams.some(entry=>entry.id===team.espnId));
     if(completed){const summary=await fetch(`/api/college-football?gameId=${completed.id}`,{cache:'no-store'});if(summary.ok){const data=await summary.json();const values:Record<string,string>={};(data.boxscore?.teams??[]).filter((entry:any)=>entry.team?.id===team.espnId).flatMap((entry:any)=>entry.statistics??[]).forEach((stat:any)=>{const value=stat.displayValue??stat.value;if(value!=null)values[String(stat.name??stat.label??'').toLowerCase()]=String(value)});if(Object.keys(values).length)return [team.abbr,values] as const}}
     return null}catch{return null}
   }));
   if(!cancelled)setMetricValues(Object.fromEntries(entries.filter(Boolean) as [string,Record<string,string>][]));
  };
  loadTeamStats();const timer=window.setInterval(loadTeamStats,300000);return()=>{cancelled=true;window.clearInterval(timer)};
 },[liveGames]);
 const navigate=(destination:string)=>{
  setSection(destination);
  const ids:Record<string,string>={Overview:'top',Rankings:'rankings',Scores:'scores',Teams:'teams'};
  requestAnimationFrame(()=>document.getElementById(ids[destination])?.scrollIntoView({behavior:'smooth',block:'start'}));
 };
 const metricSummary=(name:string)=>{const hint=name.toLowerCase().split(' ')[0];const rows=Object.entries(metricValues).map(([abbr,values])=>{const match=Object.entries(values).find(([key])=>key.includes(hint));return match?`${abbr} ${match[1]}`:null}).filter(Boolean).slice(0,3);return rows.length?rows.join(' · '):'Waiting for season statistics'};
 const toggleSchedule=async(team:typeof teams[number])=>{
  setSelected(team.abbr);
  if(expanded===team.abbr){setExpanded(null);return}
  setExpanded(team.abbr);
  if(schedules[team.abbr])return;
  setScheduleLoading(team.abbr);setScheduleError(null);
  try{
   const response=await fetch(`https://site.api.espn.com/apis/site/v2/sports/football/college-football/teams/${team.espnId}/schedule?season=2026`);
   if(!response.ok)throw new Error('Schedule unavailable');
   const data=await response.json();
   const games:ScheduleGame[]=(data.events??[]).map((event:any)=>normalizeScheduleGame(event,team));
   setSchedules(current=>({...current,[team.abbr]:games}));
  }catch{setScheduleError(team.abbr)}finally{setScheduleLoading(null)}
 };
 const toggleGame=async(game:ScheduleGame,selectedTeam:typeof teams[number],force=false,silent=false)=>{
  if(!force&&expandedGameId===game.id){setExpandedGameId(null);return}
  setExpandedGameId(game.id);if(game.state==='pre'){setLegacyLoading(null);return}if(legacyDetails[game.id]&&!force&&game.state!=='in')return;if(!silent)setLegacyLoading(game.id);
  try{
   let response=await fetch(`/api/college-football?gameId=${encodeURIComponent(game.id)}`,{cache:'no-store'});
   if(!response.ok)response=await fetch(`https://site.api.espn.com/apis/site/v2/sports/football/college-football/summary?event=${encodeURIComponent(game.id)}`,{cache:'no-store'});
   if(!response.ok)throw new Error('Unavailable');
   const data=await response.json();const boxTeams=data.boxscore?.teams??[];const normalizedTeams=normalizeGame(data.header).teams;const rows=new Map<string,GameStat>();
   boxTeams.forEach((boxTeam:any)=>{const index=normalizedTeams.findIndex(team=>team.id===boxTeam.team?.id);(boxTeam.statistics??[]).forEach((stat:any)=>{const row=rows.get(stat.name)??{name:stat.label??stat.name,away:'—',home:'—'};if(index===0)row.away=stat.displayValue??'—';if(index===1)row.home=stat.displayValue??'—';rows.set(stat.name,row)})});
   const touchdowns=[0,0],fieldGoals=[0,0],extraPoints=[0,0],twoPointConversions=[0,0],safeties=[0,0];const seenPlays=new Set<string>();
   [...(data.scoringPlays??[]),...(data.plays??[])].forEach((play:any)=>{const playKey=String(play.id??`${play.clock?.displayValue}-${play.text}`);if(seenPlays.has(playKey))return;seenPlays.add(playKey);const teamId=String(play.team?.id??play.team?.uid?.split('~').pop()??'');const index=normalizedTeams.findIndex(entry=>entry.id===teamId);if(index<0)return;const text=String(play.text??play.type?.text??'').toLowerCase();if(text.includes('touchdown'))touchdowns[index]++;if(text.includes('field goal')&&!text.includes('missed'))fieldGoals[index]++});
   normalizedTeams.forEach((team,index)=>{if(touchdowns[index]===0&&fieldGoals[index]===0){const points=Number(team.score)||0;fieldGoals[index]=points%7===3?1:0;touchdowns[index]=Math.max(0,Math.floor((points-fieldGoals[index]*3)/7))}});
   let scoringSource=game.state==='in'?'ESPN (live)':'ESPN',scoringSourceUrl='',scoringUpdatedAt='';
   const scoringTotal=(index:number)=>touchdowns[index]*6+fieldGoals[index]*3+extraPoints[index]+twoPointConversions[index]*2+safeties[index]*2;
   // CFBStats only archives finished games, so a live game's naturally-incomplete scoring tally
   // isn't worth a slow backup round-trip -- it would just fail every time until the game ends.
   if(game.state==='post'&&normalizedTeams.some((team,index)=>scoringTotal(index)!==(Number(team.score)||0))){
    try{
     const backup=await fetch(`/api/college-football?cfbStatsTeam=${encodeURIComponent(selectedTeam.name)}&opponent=${encodeURIComponent(game.opponent)}&year=${new Date(game.date).getFullYear()}`,{cache:'no-store'});
     if(backup.ok){
      const scoring=await backup.json() as {selected:ScoringBreakdown;opponent:ScoringBreakdown;sourceUrl?:string;updatedAt?:string};const selectedIndex=normalizedTeams.findIndex(team=>team.id===selectedTeam.espnId);const opponentIndex=selectedIndex===0?1:0;
      ([[selectedIndex,scoring.selected],[opponentIndex,scoring.opponent]] as [number,ScoringBreakdown][]).forEach(([index,value])=>{if(index<0||!value)return;touchdowns[index]=value.touchdowns;fieldGoals[index]=value.fieldGoals;extraPoints[index]=value.extraPoints;twoPointConversions[index]=value.twoPointConversions;safeties[index]=value.safeties});
      scoringSource='CFBStats backup';scoringSourceUrl=scoring.sourceUrl??'';scoringUpdatedAt=scoring.updatedAt??'';
     }else scoringSource=`ESPN · CFBStats unavailable (${backup.status})`;
    }catch{scoringSource='ESPN · CFBStats backup unavailable'}
   }
   const scoringVerified=normalizedTeams.map((team,index)=>scoringTotal(index)===(Number(team.score)||0)) as [boolean,boolean];
   const leaders:PlayerLeader[]=[];(data.boxscore?.players??[]).forEach((teamBlock:any)=>{const teamId=String(teamBlock.team?.id??'');(teamBlock.statistics??[]).slice(0,4).forEach((category:any)=>{const athlete=(category.athletes??[])[0];if(!athlete)return;const stats=athlete.stats??[];leaders.push({teamId,category:category.displayName??category.name??'Leader',name:athlete.athlete?.displayName??athlete.athlete?.shortName??'Team leader',value:String(athlete.displayValue??stats.slice(0,3).join(' · ')??'—')})})});
   const important=/first down|third down|fourth down|total yards|passing|comp|yards per pass|rushing|turnover|sack|penalt|red zone|possession/i;
   const stats=[...rows.values()].filter(stat=>important.test(stat.name)).slice(0,14);
   const quarterScores=(data.header?.competitions?.[0]?.competitors??[]).map((entry:any)=>({team:entry.team?.abbreviation??entry.team?.shortDisplayName??'Team',scores:(entry.linescores??[]).map((line:any)=>String(line.displayValue??line.value??'—'))}));
   const highlights=(data.videos??[]).slice(0,3).map((video:any)=>({headline:String(video.headline??video.title??'Official game highlights'),url:String(video.links?.web?.href??video.links?.self?.href??'')})).filter((video:any)=>video.url);
   const lastPlay=[highlights.length?`HIGHLIGHTS AVAILABLE: ${highlights.map((item:any)=>`${item.headline} — ${item.url}`).join(' · ')}`:'',data.plays?.at?.(-1)?.text].filter(Boolean).join(' | ');
   setLegacyDetails(current=>({...current,[game.id]:{headline:data.header?.competitions?.[0]?.status?.type?.detail??'Final',teams:normalizedTeams,stats:stats.length?stats:[...rows.values()].slice(0,8),touchdowns:touchdowns as [number,number],fieldGoals:fieldGoals as [number,number],extraPoints:extraPoints as [number,number],twoPointConversions:twoPointConversions as [number,number],safeties:safeties as [number,number],scoringVerified,scoringSource,scoringSourceUrl,scoringUpdatedAt,quarterScores,highlights,leaders,lastPlay}}));
  }catch{}finally{if(!silent)setLegacyLoading(null)}
 };
 // While a live game's stats panel is open, keep it current without the loading flash a full
 // toggleGame(force=true) would otherwise cause on every refresh.
 useEffect(()=>{
  if(!expandedGameId)return;
  let match:{game:ScheduleGame;team:typeof teams[number]}|null=null;
  for(const team of teams){
   const found=(schedules[team.abbr]??[]).find(g=>g.id===expandedGameId);
   if(found){match={game:found,team};break}
  }
  if(!match||match.game.state!=='in')return;
  const{game,team}=match;
  const timer=window.setInterval(()=>{toggleGame(game,team,true,true)},90000);
  return()=>window.clearInterval(timer);
 },[expandedGameId,schedules]);

 return <main>
   <header className="topbar">
    <a className="home-button" href="https://michealsizemore1.github.io/ChatGPT-The-Master-App/" aria-label="Return to My Life Master App">⌂ <span>Home</span></a>
   <a className="brand" href="#top" onClick={e=>{e.preventDefault();navigate('Overview')}}><span className="brand-mark">25</span><span>SATURDAY<br/><b>TOP 25</b></span></a>
   <nav aria-label="Dashboard sections">{['Overview','Rankings','Scores','Teams'].map(item=><button className={section===item?'active':''} aria-current={section===item?'page':undefined} key={item} onClick={()=>navigate(item)}>{item}</button>)}</nav>
   <label className="search"><span>⌕</span><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search teams" aria-label="Search teams"/></label>
  </header>

  <section className="score-strip anchor" id="scores" aria-label="Top 25 scoreboard">
   {visibleGames.length?visibleGames.map(game=><button className={`score-card ${game.state==='in'?'live':''}`} key={game.id} onClick={()=>setSelectedGameId(game.id)}><div className="score-meta"><span>{game.state==='in'?'LIVE':game.state==='post'?'FINAL':new Date(game.date).toLocaleDateString('en-US',{month:'short',day:'numeric'})}</span><small>{game.network||game.status}</small></div>{game.teams.map(team=><div key={team.id}><b>{team.rank&&<sup>{team.rank}</sup>}{team.abbr}</b><strong>{game.state==='pre'?'—':team.score}</strong></div>)}<small className="game-status">{game.status}</small></button>):<article className="score-card live"><div className="score-meta"><span>{liveError?'DATA DELAYED':'PRESEASON'}</span><small>STATUS</small></div><div><b>NO TOP 25 GAMES</b><strong>—</strong></div><div><small>{liveError?'Showing the latest available information':'Scores will appear when play begins'}</small></div></article>}
   {visibleGames.length<2&&<><article className="score-card"><div className="score-meta"><span>AP POLL</span><small>NO. 1</small></div><div><b>OHIO STATE</b><strong>1,672</strong></div><div><small>40 first-place votes</small></div></article><article className="score-card"><div className="score-meta"><span>RANKINGS</span><small>TEAMS</small></div><div><b>COMPLETE TOP 25</b><strong>25</strong></div><div><small>All preseason teams shown below</small></div></article><article className="score-card"><div className="score-meta"><span>LIVE FEED</span><small>{lastUpdated?`UPDATED ${lastUpdated.toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit'})}`:'CONNECTING'}</small></div><div><b>AUTO REFRESH</b><strong>2m</strong></div><div><small>Games update automatically</small></div></article></>}
  </section>

  <div className="page" id="top">
   <section className="hero"><div><p className="eyebrow">2026 AP PRESEASON POLL · AUGUST 17</p><h1>The pulse of the<br/><em>Top 25.</em></h1><p className="lede">The complete AP Top 25, poll points and team snapshots—all in one Saturday dashboard.</p></div><article className="spotlight"><div className="spot-head"><span>AP POLL LEADERS</span><b>PRESEASON</b></div><div className="matchup"><div><span className="team-dot osu">O</span><small>#1</small><h2>Ohio State</h2><strong>1,672</strong></div><p>POLL<br/><b>POINTS</b></p><div><span className="team-dot" style={{background:'#154733'}}>O</span><small>#2</small><h2>Oregon</h2><strong>1,597</strong></div></div><div className="win-line"><span>FIRST-PLACE VOTES</span><div><i style={{width:'74%'}}/></div><b>OSU 40 · ORE 14</b></div></article></section>

   {(selectedGameId||detailsLoading)&&<section className="live-center" aria-live="polite"><div className="live-center-head"><div><p className="eyebrow">LIVE GAME CENTER</p><h2>{detailsLoading?'Loading game statistics…':gameDetails?.headline||'Game details unavailable'}</h2></div><button onClick={()=>setSelectedGameId(null)}>Close ×</button></div>{gameDetails&&<><div className="live-matchup">{gameDetails.teams.map(team=><div key={team.id}><span style={{background:team.color}}>{team.logo?<img src={team.logo} alt=""/>:team.abbr[0]}</span><b>{team.rank&&`#${team.rank} `}{team.name}</b><strong>{team.score}</strong></div>)}</div>{gameDetails.lastPlay&&<p className="last-play"><b>LATEST:</b> {gameDetails.lastPlay}</p>}<div className="boxscore"><div className="boxscore-head"><span>TEAM STAT</span><b>{gameDetails.teams[0]?.abbr}</b><b>{gameDetails.teams[1]?.abbr}</b></div>{gameDetails.stats.length?gameDetails.stats.map(stat=><div key={stat.name}><span>{stat.name}</span><b>{stat.away}</b><b>{stat.home}</b></div>):<p>Detailed team statistics will populate after the game begins.</p>}</div></>}</section>}

   <section className="content-grid">
    <article className="rankings panel anchor" id="rankings">
     <div className="panel-title"><div><p className="eyebrow">AP PRESEASON POLL · ALL 25 TEAMS</p><h2>Top 25 rankings</h2></div><button onClick={()=>navigate('Scores')}>Season status ↑</button></div>
     <div className="table-head"><span>RK</span><span>TEAM</span><span>REC</span><span>PTS</span><span>SCHEDULE</span></div>
     {filtered.map((t,i)=><div className="team-entry" key={t.abbr}>{(i===0||conferenceOf(filtered[i-1])!==conferenceOf(t))&&<div className="conference-heading">{conferenceOf(t)}</div>}
      <button onClick={()=>toggleSchedule(t)} aria-expanded={expanded===t.abbr} aria-controls={`schedule-${t.abbr}`} className={selected===t.abbr?'team-row selected':'team-row'}><b>{t.rank}</b><span className="team-name"><i className="team-logo" style={{background:t.color}}><span>{t.abbr}</span><img src={`https://a.espncdn.com/i/teamlogos/ncaa/500/${t.espnId}.png`} alt={`${t.name} logo`} onError={event=>{event.currentTarget.style.display='none'}} /></i><span><strong>{t.name}</strong><small>{t.abbr}</small><small className="weekly-score">{weeklyScores[t.espnId]?`THIS WEEK · ${weeklyScores[t.espnId]}`:'NO GAME THIS WEEK'}</small></span></span><span className="team-record">{currentRecords[t.espnId]??t.record}</span><strong>{t.points.toLocaleString()}</strong><span className="schedule-cta">{expanded===t.abbr?'Close':'View'} <i>{expanded===t.abbr?'↑':'↓'}</i></span></button>
     {expanded===t.abbr&&<div className="schedule-panel" id={`schedule-${t.abbr}`}><div className="schedule-head"><span><b>{t.name}</b> · 2026 SCHEDULE</span><small>{scheduleLoading===t.abbr?'LOADING…':`${schedules[t.abbr]?.length??0} GAMES`}</small></div>{scheduleLoading===t.abbr?<p className="schedule-message">Loading the latest schedule…</p>:scheduleError===t.abbr?<p className="schedule-message">Schedule could not be loaded. Close and try again.</p>:(schedules[t.abbr]??[]).map(game=><div className="schedule-game-wrap" key={game.id}><button className="schedule-game" onClick={()=>toggleGame(game,t)} aria-expanded={expandedGameId===game.id}><time dateTime={game.date}>{new Date(game.date).toLocaleDateString('en-US',{month:'short',day:'numeric'})}</time><span>{game.neutral?'vs':game.venue} <b>{game.opponent}</b></span><small>{mountainTime(new Date(game.date))} MT · {expandedGameId===game.id?'Close':game.state==='post'?'Stats':'Details'} {expandedGameId===game.id?'↑':'↓'}</small></button>{expandedGameId===game.id&&<div className="legacy-game-panel">{game.state==='pre'?<p className="schedule-message"><b>{game.status}</b> · {mountainTime(new Date(game.date))} MT{game.network?` · ${game.network}`:''}<br/>Game statistics will appear once the game starts.</p>:legacyLoading===game.id?<p className="schedule-message">{game.state==='in'?'Loading live game statistics…':'Loading archived game statistics…'}</p>:legacyDetails[game.id]?<><p className="archive-label">{game.state==='in'?'LIVE STATS':'GAME ARCHIVE'} · {legacyDetails[game.id].headline}</p><div className="team-archive-grid">{legacyDetails[game.id].teams.map((team,index)=><section className="team-archive" key={team.id}><header><span><small>{team.id===t.espnId?'SELECTED TEAM':'OPPONENT'}</small><b>{team.name}</b></span><strong>{team.score}</strong></header><div className="team-stat-list">{legacyDetails[game.id].stats.map(stat=><div key={stat.name}><span>{stat.name}</span><b>{index===0?stat.away:stat.home}</b></div>)}{legacyDetails[game.id].touchdowns&&<div><span>Touchdowns</span><b>{legacyDetails[game.id].touchdowns[index]}</b></div>}{legacyDetails[game.id].fieldGoals&&<div><span>Field goals</span><b>{legacyDetails[game.id].fieldGoals[index]}</b></div>}{legacyDetails[game.id].extraPoints&&<div><span>Extra points</span><b>{legacyDetails[game.id].extraPoints[index]}</b></div>}{legacyDetails[game.id].twoPointConversions&&<div><span>2-point conversions</span><b>{legacyDetails[game.id].twoPointConversions[index]}</b></div>}{legacyDetails[game.id].safeties&&<div><span>Safeties</span><b>{legacyDetails[game.id].safeties[index]}</b></div>}<div><span>Scoring check</span><b>{game.state==='in'?'● Live — game in progress':legacyDetails[game.id].scoringVerified?.[index]?'✓ Matches':'⚠ Review'}</b></div></div><div className="team-leaders"><p>PLAYER LEADERS</p>{legacyDetails[game.id].leaders?.filter(leader=>leader.teamId===team.id).length?legacyDetails[game.id].leaders?.filter(leader=>leader.teamId===team.id).map(leader=><div key={`${leader.category}-${leader.name}`}><span><small>{leader.category}</small>{leader.name}</span><b>{leader.value}</b></div>):<small className="leaders-pending">Player leaders have not been posted by the provider.</small>}</div></section>)}</div><p className="archive-label">SCORING SOURCE · {legacyDetails[game.id].scoringSource??'ESPN'}</p>{legacyDetails[game.id].lastPlay&&<p className="last-play"><b>LAST PLAY:</b> {legacyDetails[game.id].lastPlay}</p>}</>:<p className="schedule-message">{game.state==='in'?'Live statistics have not been posted yet.':'No archived statistics are available for this game yet.'}</p>}</div>}</div>)}</div>}
     </div>)}
    </article>
    <aside className="sidebar"><article className="team-card panel anchor" id="teams"><div className="team-card-head" style={{background:active.color}}><span>{active.abbr[0]}</span><div><p>TEAM SNAPSHOT</p><h2>{active.name}</h2><small>#{active.rank} · {active.record}</small></div></div><div className="metric-grid"><div><small>POINTS / GAME</small><strong>{active.pf}</strong><span>PRESEASON — NO GAMES YET</span></div><div><small>YARDS / GAME</small><strong>{active.ypg}</strong><span>PRESEASON — NO GAMES YET</span></div><div><small>POINTS ALLOWED</small><strong>{active.pa}</strong><span>PRESEASON — NO GAMES YET</span></div><div><small>AP POINTS</small><strong>{active.points}</strong><span>2026 PRESEASON POLL</span></div></div><button className="primary" onClick={()=>navigate('Rankings')}>Choose another team</button></article><article className="news panel"><div className="panel-title"><div><p className="eyebrow">FIELD NOTES</p><h2>Top stories</h2></div></div>{stories.map(([tag,title],i)=><div className="story" key={tag}><b>0{i+1}</b><span><small>{tag}</small><strong>{title}</strong></span></div>)}</article></aside>
   </section>
   <section className="metrics-section panel anchor" id="metrics"><div className="panel-title"><div><p className="eyebrow">THE STAT BOARD</p><h2>Essential metrics</h2></div><div className="metric-tabs" role="tablist" aria-label="Metric category"><button className={metricView==='team'?'active':''} onClick={()=>setMetricView('team')} role="tab" aria-selected={metricView==='team'}>Team</button><button className={metricView==='player'?'active':''} onClick={()=>setMetricView('player')} role="tab" aria-selected={metricView==='player'}>Player</button></div></div><p className="metrics-intro">Live season values refresh automatically as games are completed. A dash means the provider has not posted that metric yet.</p><div className="metrics-grid">{(metricView==='team'?teamStats:playerStats).map(([name,description],index)=><article className="metric-item" key={name}><span>{String(index+1).padStart(2,'0')}</span><div><h3>{name}</h3><p>{description}</p><small className="metric-feed">{metricView==='team'?<>{metricSummary(name)}{Object.keys(metricValues).length?` · ${Object.keys(metricValues).length}/25 teams reporting`:''}</>:'Waiting for season statistics'}</small></div></article>)}</div></section>
   <footer><span>TOP 25</span><p>2026 AP preseason rankings · Poll released August 17, 2026</p><small>Built for My Life Master App</small></footer>
  </div>
 </main>;
}
