/* Currentscy Picks V102 — NCAA-only 100,000 trial integration.
   Historical resampling is exploratory, not a calibrated win probability.
   Does not touch NFL, NBA, or other sport simulations. */
(()=>{'use strict';
if(typeof v62AnalyzeTeamSport!=='function'||typeof v62TeamHistory!=='function')return;
const previous=v62AnalyzeTeamSport;
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const valid=x=>Number.isFinite(x)&&x>=0;
function trials(away,home,count=100000){
 if(!Array.isArray(away?.scores)||!Array.isArray(home?.scores)||away.scores.length<3||home.scores.length<3)throw Error('At least three verified completed games are required for each team');
 const a=away.scores.filter(x=>valid(x.scored)&&valid(x.allowed));
 const h=home.scores.filter(x=>valid(x.scored)&&valid(x.allowed));
 if(a.length<3||h.length<3)throw Error('Not enough valid historical scores');
 let aw=0,hw=0,ties=0,as=0,hs=0;
 const hist=new Map();
 for(let i=0;i<count;i++){
  const x=a[Math.floor(Math.random()*a.length)],y=h[Math.floor(Math.random()*h.length)];
  const ap=Math.max(0,Math.round((x.scored+y.allowed)/2));
  const hp=Math.max(0,Math.round((y.scored+x.allowed)/2));
  as+=ap;hs+=hp;
  if(ap>hp)aw++;else if(hp>ap)hw++;else ties++;
  const margin=hp-ap,bucket=Math.max(-60,Math.min(60,Math.round(margin/7)*7));
  hist.set(bucket,(hist.get(bucket)||0)+1);
 }
 return {count,awayWinShare:aw/count,homeWinShare:hw/count,tieShare:ties/count,awayScore:as/count,homeScore:hs/count,marginHistogram:[...hist].sort((x,y)=>x[0]-y[0]),calibrated:false,model:'Historical score bootstrap',inputs:{awayGames:a.length,homeGames:h.length}};
}
window.CurrentscyNCAASimulationV102=Object.freeze({trials,version:'V102',cfbdActive:false,sportsDataverseActive:false});
v62AnalyzeTeamSport=async function(){
 if(sport!=='ncaa')return previous();
 const btn=document.getElementById('simulate'),results=document.getElementById('results'),status=document.getElementById('dataStatus');
 if(!btn||!results)return;
 const selected=chosen,comp=selected?.competitions?.[0]?.competitors||[];
 const away=comp.find(x=>x.homeAway==='away'),home=comp.find(x=>x.homeAway==='home');
 if(!away||!home){results.innerHTML='<div class="panel">Missing NCAA team IDs.</div>';return}
 btn.disabled=true;btn.textContent='Loading verified NCAA games…';
 results.innerHTML='<div class="panel">Checking NCAA-only completed games…</div>';
 try{
  const cutoff=Date.parse(selected.date);
  if(!Number.isFinite(cutoff))throw Error('Selected game date is unavailable');
  const [a,h]=await Promise.all([v62TeamHistory(away,'football/college-football',cutoff),v62TeamHistory(home,'football/college-football',cutoff)]);
  if(chosen!==selected||sport!=='ncaa')return;
  btn.textContent='Running 100,000 NCAA trials…';
  await new Promise(resolve=>setTimeout(resolve,20));
  const model=trials(a,h);
  if(chosen!==selected||sport!=='ncaa')return;
  const pct=n=>(100*n).toFixed(1)+'%';
  const tile=(label,value)=>'<div class="tile"><small>'+esc(label)+'</small><b>'+esc(value)+'</b></div>';
  results.innerHTML='<div class="panel"><h2>NCAA Football · 100,000 historical trials</h2><div class="grid">'+
   tile(a.name+' trial win share',pct(model.awayWinShare))+
   tile(h.name+' trial win share',pct(model.homeWinShare))+
   tile('Average sampled score',model.awayScore.toFixed(1)+' – '+model.homeScore.toFixed(1))+
   tile('Sampled ties',pct(model.tieShare))+
   '</div><p class="desc">Exploratory NCAA-only historical score resampling, not calibrated probabilities. CFBD and SportsDataverse advanced metrics are not yet connected to this calculation. Ties are simulation artifacts; NCAA games use overtime.</p></div>'+
   '<div class="panel"><h2>Recent verified NCAA games</h2><div class="grid">'+[a,h].map(t=>'<div class="tile"><strong>'+esc(t.name)+'</strong><ul>'+t.scores.slice(0,5).map(g=>'<li>'+esc(g.opponent)+': '+g.scored+'–'+g.allowed+'</li>').join('')+'</ul></div>').join('')+'</div></div>';
  if(status)status.textContent='NCAA completed games: '+model.inputs.awayGames+' '+a.name+', '+model.inputs.homeGames+' '+h.name+'. Historical trial frequencies only.';
 }catch(e){
  if(chosen===selected&&sport==='ncaa'){
   results.innerHTML='<div class="panel"><h2>Insufficient verified NCAA data</h2><p>'+esc(e.message)+'</p><p class="desc">No invented win percentages or NFL statistics are substituted.</p></div>';
   if(status)status.textContent='NCAA historical simulation unavailable';
  }
 }finally{
  if(chosen===selected&&sport==='ncaa'){btn.disabled=false;btn.textContent='Run 100,000 NCAA Football team trials'}
 }
};
})();