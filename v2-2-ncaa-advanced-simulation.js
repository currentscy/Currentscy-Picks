/* Currentscy Picks V2.2 Step 3: NCAA CFBD efficiency matchup.
   NCAA only; independent supplementary 100,000 trials. Does not alter NFL/NBA.
   This is exploratory and uncalibrated, not a prediction guarantee. */
(()=>{'use strict';
if(typeof v62AnalyzeTeamSport!=='function')return;
const prior=v62AnalyzeTeamSport;
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]));
const key=s=>String(s??'').toLowerCase().replace(/[^a-z0-9]/g,'').replace(/cyclones|knights|bearcats|wildcats|cougars|cowboys|bears|eagles|tigers/g,'');
const same=(a,b)=>key(a)===key(b)||(['ucf','centralflorida'].includes(key(a))&&['ucf','centralflorida'].includes(key(b)));
const n=x=>x===null||x===undefined||x===''?null:Number.isFinite(Number(x))?Number(x):null;
function profile(row){
 if(!row||typeof row!=='object')return null;
 const off=row.offense,def=row.defense;
 if(!off||!def)return null;
 const o=n(off.successRate),d=n(def.successRate);
 if(o===null||d===null||o<0||o>1||d<0||d>1)return null;
 const op=n(off.ppa),dp=n(def.ppa);
 return {name:row.team,off:o,def:d,offPpa:op,defPpa:dp,plays:n(off.plays)};
}
function simulate(a,h,ap,hp,count=100000){
 const ah=a.scores.filter(x=>Number.isFinite(x.scored)&&Number.isFinite(x.allowed));
 const hh=h.scores.filter(x=>Number.isFinite(x.scored)&&Number.isFinite(x.allowed));
 if(ah.length<3||hh.length<3)throw Error('Insufficient completed games');
 // Efficiency is shrunk toward zero to avoid overfitting an entire season.
 const rawA=(ap.off-hp.def),rawH=(hp.off-ap.def);
 const shiftA=Math.max(-6,Math.min(6,rawA*28));
 const shiftH=Math.max(-6,Math.min(6,rawH*28));
 let away=0,home=0,tie=0,as=0,hs=0;
 for(let i=0;i<count;i++){
  const x=ah[Math.floor(Math.random()*ah.length)],y=hh[Math.floor(Math.random()*hh.length)];
  const av=Math.max(0,Math.round((x.scored+y.allowed)/2+shiftA));
  const hv=Math.max(0,Math.round((y.scored+x.allowed)/2+shiftH));
  as+=av;hs+=hv;
  if(av>hv)away++;else if(hv>av)home++;else tie++;
 }
 return {away:away/count,home:home/count,tie:tie/count,awayScore:as/count,homeScore:hs/count,shiftA,shiftH,count};
}
v62AnalyzeTeamSport=async function(){
 if(sport!=='ncaa')return prior();
 const selected=chosen,comp=selected?.competitions?.[0]?.competitors||[];
 const away=comp.find(x=>x.homeAway==='away'),home=comp.find(x=>x.homeAway==='home');
 // Preserve the working historical simulation and its error handling.
 await prior();
 if(chosen!==selected||sport!=='ncaa'||!away||!home)return;
 const results=document.getElementById('results'),status=document.getElementById('dataStatus');
 if(!results||!window.CurrentscyCFBDV103)return;
 const year=new Date(selected.date).getUTCFullYear(),cutoff=Date.parse(selected.date);
 if(!Number.isFinite(year)||!Number.isFinite(cutoff))return;
 const marker='ncaa-cfbd-advanced-v22';
 const slot=document.createElement('div');slot.id=marker;slot.className='panel';
 slot.innerHTML='<h2>CFBD offense vs defense</h2><p class="desc">Checking verified season efficiency data…</p>';
 results.appendChild(slot);
 try{
  const [data,a,h]=await Promise.all([
   window.CurrentscyCFBDV103.request('advanced',{year}),
   v62TeamHistory(away,'football/college-football',cutoff),
   v62TeamHistory(home,'football/college-football',cutoff)
  ]);
  if(chosen!==selected||sport!=='ncaa'||!slot.isConnected)return;
  const pa=profile(data.items.find(r=>same(r.team,a.name)));
  const ph=profile(data.items.find(r=>same(r.team,h.name)));
  if(!pa||!ph)throw Error('Advanced efficiency records missing or invalid for one or both teams');
  const m=simulate(a,h,pa,ph);
  const pct=x=>(100*x).toFixed(1)+'%';
  slot.innerHTML='<h2>NCAA · CFBD-adjusted 100,000 trials</h2><div class="grid">'+
   '<div class="tile"><small>'+esc(a.name)+' trial win share</small><b>'+pct(m.away)+'</b></div>'+
   '<div class="tile"><small>'+esc(h.name)+' trial win share</small><b>'+pct(m.home)+'</b></div>'+
   '<div class="tile"><small>Adjusted sampled score</small><b>'+m.awayScore.toFixed(1)+' – '+m.homeScore.toFixed(1)+'</b></div>'+
   '<div class="tile"><small>Sampled ties</small><b>'+pct(m.tie)+'</b></div></div>'+
   '<p class="desc">CFBD season success rates: '+esc(a.name)+' offense '+pct(pa.off)+', defense allowed '+pct(pa.def)+'; '+esc(h.name)+' offense '+pct(ph.off)+', defense allowed '+pct(ph.def)+'. Score shifts capped at ±6 points. Exploratory, not calibrated; ties are sampling artifacts. Does not include verified player availability, opponent-specific EPA, or overtime.</p>';
  if(status)status.textContent+=' CFBD advanced success-rate adjustment available.';
 }catch(e){
  if(chosen===selected&&sport==='ncaa'&&slot.isConnected){
   slot.innerHTML='<h2>CFBD efficiency adjustment unavailable</h2><p class="desc">'+esc(e.message)+'</p><p class="desc">Historical NCAA trials above remain available; no advanced statistics were invented.</p>';
  }
 }
};
})();