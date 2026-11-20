/* Currentscy Picks V104: CFBD completed-game history fallback for NCAA only.
   ESPN remains primary; CFBD supplies verified games when ESPN is sparse.
   No unverified injuries or player props are synthesized. */
(()=>{'use strict';
if(typeof v62TeamHistory!=='function')return;
const prior=v62TeamHistory;
const key=s=>String(s??'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'').replace(/cyclones|knights|wildcats|tigers|bulldogs|bears|eagles|cougars|huskies|panthers|cardinals|longhorns|aggies|cowboys|spartans|trojans|warriors|falcons|rebels|volunteers|gators|seminoles|buckeyes|wolverines|sooners|razorbacks|jayhawks|mountaineers|broncos|rams|redraiders|golden|fighting|stateuniversity/g,'');
const canonical=s=>{let x=key(s);if(['ucf','centralflorida','universityofcentralflorida'].includes(x))return 'ucf';if(['iowastate','iowast'].includes(x))return 'iowastate';return x};
const same=(a,b)=>canonical(a)===canonical(b);
function parseGame(g,name,cutoff){
 if(!g||g.completed!==true)return null;
 const date=Date.parse(g.startDate??g.start_date??g.date);
 if(!Number.isFinite(date)||date>=cutoff)return null;
 const home=g.homeTeam??g.home_team,away=g.awayTeam??g.away_team;
 const isHome=same(home,name),isAway=same(away,name);
 if(isHome===isAway)return null;
 const hs=Number(g.homePoints??g.home_points),as=Number(g.awayPoints??g.away_points);
 if(!Number.isFinite(hs)||!Number.isFinite(as)||hs<0||as<0)return null;
 return {scored:isHome?hs:as,allowed:isHome?as:hs,opponent:isHome?away:home,date:new Date(date).toISOString(),source:'CFBD',id:String(g.id??''),season:Number(g.season)};
}
v62TeamHistory=async function(team,league,cutoff){
 if(league!=='football/college-football')return prior(team,league,cutoff);
 const name=team?.team?.displayName||team?.team?.name||'Unknown NCAA team';
 let espn=null,espnError=null;
 try{espn=await prior(team,league,cutoff)}catch(e){espnError=String(e?.message||e)}
 if(espn?.scores?.length>=3)return espn;
 const cfbd=window.CurrentscyCFBDV103;
 if(!cfbd?.request)throw Error(name+': ESPN history insufficient; CFBD client unavailable. '+(espnError||''));
 const year=new Date(cutoff).getUTCFullYear();
 const seasons=[year,year-1];
 const responses=await Promise.allSettled(seasons.map(season=>cfbd.request('games',{year:season,team:name})));
 let rows=[],errors=[];
 for(let i=0;i<responses.length;i++){
  const r=responses[i];if(r.status==='fulfilled')rows.push(...r.value.items);
  else errors.push(seasons[i]+': '+String(r.reason?.message||r.reason));
 }
 // Provider team search may use a different canonical name; try year-wide records.
 if(!rows.some(g=>parseGame(g,name,cutoff))){
  const all=await Promise.allSettled(seasons.map(season=>cfbd.request('games',{year:season})));
  for(let i=0;i<all.length;i++){
   const r=all[i];if(r.status==='fulfilled')rows.push(...r.value.items);
   else errors.push('all '+seasons[i]+': '+String(r.reason?.message||r.reason));
  }
 }
 const parsed=rows.map(g=>parseGame(g,name,cutoff)).filter(Boolean);
 const seen=new Set(),scores=[];
 for(const g of parsed.sort((a,b)=>Date.parse(b.date)-Date.parse(a.date))){
  const k=g.id||g.date.slice(0,10)+'|'+canonical(g.opponent);
  if(seen.has(k))continue;seen.add(k);
  scores.push(g);
  if(scores.length>=12)break;
 }
 if(scores.length<3)throw Error(name+' has only '+scores.length+' verified CFBD completed games (minimum 3). '+errors.slice(0,2).join('; ')+(espnError?' ESPN: '+espnError:''));
 return {name,scores,source:'CFBD',seasons:[...new Set(scores.map(x=>x.season))],verifiedGames:scores.length};
};
})();