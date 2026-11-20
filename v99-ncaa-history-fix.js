/* NCAA history repair: NCAA-only; NFL and NBA paths remain unchanged. */
(function(){
'use strict';
if(typeof v62TeamHistory!=='function'||typeof v64RecentGames!=='function')return;
const oldHistory=v62TeamHistory,oldRecent=v64RecentGames;
const completed=e=>e?.status?.type?.completed===true||e?.competitions?.[0]?.status?.type?.completed===true;
const score=c=>{
 const v=c?.score;
 if(v===null||v===undefined||v==='')return NaN;
 const raw=typeof v==='object'?(v.value??v.displayValue):v;
 return raw===null||raw===undefined||raw===''?NaN:Number(raw);
};
v64RecentGames=async function(team,league,cutoff,limit=4){
 if(league!=='football/college-football')return oldRecent(team,league,cutoff,limit);
 const id=String(team?.team?.id||''),abbr=String(team?.team?.abbreviation||'').toUpperCase();
 if(!id)return {games:[],errors:['Missing NCAA team ID']};
 const found=new Map(),errors=[];
 const add=e=>{
  const when=Date.parse(e?.date);
  if(!completed(e)||!Number.isFinite(when)||when>=cutoff||!e?.id)return;
  const cs=e.competitions?.[0]?.competitors||[];
  if(cs.some(c=>String(c.team?.id)===id||(abbr&&String(c.team?.abbreviation||'').toUpperCase()===abbr)))found.set(String(e.id),e);
 };
 try{
  const d=await get(root+league+'/teams/'+encodeURIComponent(id)+'/schedule?season='+new Date(cutoff).getUTCFullYear()+'&limit=200');
  (d.events||[]).forEach(add);
 }catch(e){errors.push('NCAA schedule: '+e.message)}
 // Explicit FBS group: default college scoreboards can return only a subset of games.
 if(found.size<limit){
  for(let days=0;days<100&&found.size<limit;days+=7){
   const end=new Date(cutoff-1-days*86400000),begin=new Date(end.getTime()-6*86400000);
   const fmt=d=>d.getUTCFullYear()+String(d.getUTCMonth()+1).padStart(2,'0')+String(d.getUTCDate()).padStart(2,'0');
   try{
    const d=await get(root+league+'/scoreboard?dates='+fmt(begin)+'-'+fmt(end)+'&groups=80&limit=500');
    (d.events||[]).forEach(add);
   }catch(e){errors.push('NCAA scoreboard: '+e.message)}
  }
 }
 return {games:[...found.values()].sort((a,b)=>Date.parse(b.date)-Date.parse(a.date)).slice(0,limit),errors};
};
v62TeamHistory=async function(team,league,cutoff){
 if(league!=='football/college-football')return oldHistory(team,league,cutoff);
 const id=String(team?.team?.id||''),name=team?.team?.displayName||'Team';
 if(!id)throw Error('Missing NCAA team ID');
 const history=await v64RecentGames(team,league,cutoff,12),scores=[];
 for(const e of history.games){
  const cs=e.competitions?.[0]?.competitors||[];
  const mine=cs.find(c=>String(c.team?.id)===id),opp=cs.find(c=>String(c.team?.id)!==id);
  if(!mine||!opp)continue;
  const scored=score(mine),allowed=score(opp);
  if(Number.isFinite(scored)&&Number.isFinite(allowed))scores.push({scored,allowed,opponent:opp.team?.displayName||'Opponent',date:e.date});
 }
 if(scores.length<3)throw Error(name+' has only '+scores.length+' verified recent completed games (minimum 3)'+(history.errors.length?'; some ESPN feeds unavailable':''));
 return {name,scores};
};
})();