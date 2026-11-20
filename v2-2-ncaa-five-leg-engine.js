/* Currentscy Picks V2.2 — NCAA five-leg evidence engine.
   Pure model utilities; do not manufacture players, injuries, probabilities,
   or overwrite the live NCAA diagnostic until CFBD fields are validated. */
(()=>{'use strict';
const norm=s=>String(s??'').toLowerCase().replace(/[^a-z0-9]/g,'');
const categories={
 passingyards:{label:'Passing yards',thresholds:[125,150,175,200,225,250]},
 rushingyards:{label:'Rushing yards',thresholds:[15,25,40,50,60,75]},
 receivingyards:{label:'Receiving yards',thresholds:[10,20,30,40,50,60]},
 receptions:{label:'Receptions',thresholds:[1,2,3,4,5,6]}
};
function metric(category,stat){
 const c=norm(category),s=norm(stat);
 if(/passing/.test(c)&&/^(yds|yards|passingyards)$/.test(s))return 'passingyards';
 if(/rushing/.test(c)&&/^(yds|yards|rushingyards)$/.test(s))return 'rushingyards';
 if(/receiving/.test(c)&&/^(yds|yards|receivingyards)$/.test(s))return 'receivingyards';
 if(/receiving/.test(c)&&/^(rec|receptions|catches)$/.test(s))return 'receptions';
 return null;
}
function extract(games,teams){
 const selected=new Set(teams.map(norm));
 const records=new Map();
 for(const game of Array.isArray(games)?games:[]){
  if(!game?.id||!Array.isArray(game.teams))continue;
  for(const team of game.teams){
   const teamName=team.school||team.team||team.name||'';
   if(!selected.has(norm(teamName)))continue;
   for(const category of team.categories||[]){
    for(const type of category.types||[]){
     const kind=metric(category.name||category.type,type.name||type.type||type.abbreviation);
     if(!kind)continue;
     for(const athlete of type.athletes||[]){
      const name=athlete.name||athlete.athlete?.displayName;
      const value=Number(athlete.stat??athlete.value);
      if(!name||!Number.isFinite(value)||value<0)continue;
      const id=String(athlete.id||athlete.athlete?.id||name);
      const k=[norm(teamName),id,kind].join('|');
      if(!records.has(k))records.set(k,{id,name,team:teamName,kind,games:new Map()});
      records.get(k).games.set(String(game.id),value);
     }
    }
   }
  }
 }
 return [...records.values()].map(r=>({...r,values:[...r.games.values()],games:undefined})).filter(r=>r.values.length>=5);
}
function evaluate(records,opts={}){
 const minGames=Math.max(5,Number(opts.minGames)||5),maxPerPlayer=1;
 const options=[];
 for(const r of records){
  if(!categories[r.kind]||r.values.length<minGames)continue;
  const sample=r.values.slice(0,10);
  for(const threshold of categories[r.kind].thresholds){
   const hits=sample.filter(v=>v>=threshold).length;
   const rate=hits/sample.length;
   if(rate<0.7)continue;
   options.push({name:r.name,team:r.team,kind:r.kind,label:categories[r.kind].label,threshold,hits,games:sample.length,hitRate:rate,average:sample.reduce((a,b)=>a+b,0)/sample.length,availability:'unverified',opponentAdjusted:false,estimatedProbability:null});
  }
 }
 options.sort((a,b)=>b.hitRate-a.hitRate||b.games-a.games||b.threshold-a.threshold);
 const selected=[],used=new Set();
 for(const x of options){
  const k=norm(x.team)+'|'+norm(x.name);
  if(used.has(k)&&maxPerPlayer===1)continue;
  selected.push(x);used.add(k);
  if(selected.length===5)break;
 }
 return {candidates:selected,ready:selected.length===5,eligibleCount:options.length,reason:selected.length<5?'Fewer than five distinct players have sufficient observed logs':null,verifiedAvailability:false,calibrated:false};
}
window.CurrentscyNCAAFiveLegV22=Object.freeze({metric,extract,evaluate,version:'V2.2',liveConnected:false,note:'Research only; availability and matchup adjustments are not verified'});
})();