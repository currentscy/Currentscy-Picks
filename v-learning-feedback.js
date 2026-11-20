/* Currentscy Picks: verified forecast-vs-result display, never fabricated results. */
(()=>{'use strict';
 const ID='currentscy-feedback';
 let lastFetch=0,cache=null,loading=false;
 const css='background:#0c1019;border:1px solid #4b432d;border-radius:14px;padding:14px;margin:12px 0;color:#f4f2ec;font:14px system-ui,sans-serif';
 function sport(){const raw=(document.body.dataset.sport||'').toLowerCase();return raw==='ncaa'?'ncaa-football':raw}
 function relevant(g,s){return !s||g.sport===s||s==='soccer'&&g.sport?.startsWith('soccer-')}
 function el(tag,txt){const n=document.createElement(tag);n.textContent=txt;return n}
 function render(){
  const games=document.getElementById('games'),listing=document.getElementById('listing');
  const shown=games&&listing&&!listing.classList.contains('hidden');
  let box=document.getElementById(ID);
  if(!shown){box?.remove();return}
  if(!box){box=document.createElement('section');box.id=ID;box.style.cssText=css;games.parentNode.insertBefore(box,games)}
  box.replaceChildren();
  box.appendChild(el('h3','Prediction accuracy · verified history'));
  if(!cache){box.appendChild(el('p',loading?'Loading saved prediction history…':'Prediction history unavailable. No accuracy claim can be made.'));return}
  const filtered=(cache.games||[]).filter(x=>relevant(x,sport()));
  const scored=filtered.filter(x=>x.status==='scored');
  box.appendChild(el('p',scored.length+' scored predictions · '+(filtered.length-scored.length)+' awaiting final results. Predictions must be archived before kickoff.'));
  if(!scored.length){box.appendChild(el('p','No verified prediction-versus-result comparisons yet for this sport.'));return}
  scored.slice(0,5).forEach(x=>{
   const row=el('div',x.away+' @ '+x.home+' · Pick: '+x.predictedWinner+' ('+Math.round(x.predictedWinnerProbability*100)+'%) · Final: '+x.result.awayScore+'–'+x.result.homeScore+' · '+(x.result.homeWon===(x.homeWinProbability>=.5)?'Correct':'Incorrect'));
   row.style.cssText='padding:9px 0;border-top:1px solid #39372e';box.appendChild(row)
  });
  const footer=el('small','Accuracy is based on saved pregame forecasts, not predictions reconstructed after a game. These models are experimental and not guaranteed to improve.');
  footer.style.opacity='.75';box.appendChild(footer)
 }
 async function update(){
  if(loading||Date.now()-lastFetch<300000)return;
  loading=true;lastFetch=Date.now();
  try{const r=await fetch('research-ledger/forecast-vs-results.json?ts='+Math.floor(Date.now()/300000),{cache:'no-store'});
   if(!r.ok)throw Error('No report');cache=await r.json()
  }catch{cache=null}finally{loading=false;render()}
 }
 function tick(){render();update()}
 function init(){tick();new MutationObserver(tick).observe(document.body,{attributes:true,attributeFilter:['data-sport'],childList:true,subtree:false});
  const listing=document.getElementById('listing');if(listing)new MutationObserver(tick).observe(listing,{attributes:true,attributeFilter:['class']});
  setInterval(tick,60000)
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init()
})();
