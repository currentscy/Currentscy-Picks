/* Currentscy Picks ESPN connection self-test. User-initiated, read-only. */
(()=>{'use strict';
const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function init(){
 if(document.getElementById('cp-espn-test'))return;
 const panel=document.createElement('section');panel.id='cp-espn-test';
 panel.style.cssText='margin:16px auto;padding:14px;max-width:800px;border:1px solid #575044;border-radius:12px;background:#101217;color:#f2f2f2';
 panel.innerHTML='<strong>ESPN live data check</strong><p style="font-size:13px;color:#bbb">Run a real ESPN scoreboard and play-by-play request for completed NFL and NCAA games. This does not change predictions.</p><button type="button" style="padding:9px 13px;background:#bd9954;color:#111;border:0;border-radius:7px;font-weight:700">Test NFL + NCAA</button><div role="status" style="margin-top:9px;font-size:13px;white-space:pre-wrap"></div>';
 const button=panel.querySelector('button'),output=panel.querySelector('[role=status]');
 button.addEventListener('click',async()=>{
  button.disabled=true;output.textContent='Testing live ESPN requests…';
  try{
   const diag=window.CurrentscyESPNDiagnosticsV30;
   if(!diag)throw Error('Diagnostics module missing');
   const jobs=[['nfl','20261115'],['ncaa','20261114']];
   const results=await Promise.all(jobs.map(async([league,date])=>({league,...await diag.verify(league,date)})));
   output.textContent=results.map(r=>r.league.toUpperCase()+': '+(r.verified?'VERIFIED':'NOT VERIFIED')+'\n'+(r.tested?'Plays: '+r.tested.totalPlays+', team/half attributed: '+r.tested.teamAttributedHalfPlays+'\n'+r.tested.source:r.error||r.reason||'No completed game found')).join('\n\n');
   window.CurrentscyESPNLatestSelfTest=results;
  }catch(e){output.textContent='Test failed: '+String(e?.message||e)}
  finally{button.disabled=false}
 });
 const root=document.querySelector('main')||document.body;
 root.append(panel);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();