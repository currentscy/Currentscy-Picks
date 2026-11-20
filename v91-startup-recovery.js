/* V91 startup recovery: show sports even if a legacy bundle fails. */
(function(){'use strict';
const games=[['nfl','🏈','NFL'],['nba','🏀','NBA'],['ncaa','🏈','NCAA Football'],['nhl','🏒','NHL'],['mlb','⚾','MLB'],['soccer','⚽','Soccer'],['tennis','🎾','Tennis'],['ufc','🥊','UFC']];
function run(){
 const nav=document.getElementById('sports');if(!nav)return;
 if(nav.querySelector('.sport'))return;
 nav.innerHTML=games.map(([id,emoji,label])=>'<button type="button" class="sport" data-sport="'+id+'"><em>'+emoji+'</em>'+label+'</button>').join('');
 const info=document.createElement('p');info.className='hint';info.id='v91-boot-warning';info.setAttribute('role','status');info.textContent='Sports navigation restored, but the legacy game engine did not initialize. Predictions are temporarily unavailable. Refresh the page; if this persists, the engine needs repair.';
 nav.parentElement.appendChild(info);
 nav.querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>{
  const active=b.dataset.sport;document.body.dataset.sport=active;
  document.getElementById('homeIntro')?.classList.add('hidden');
  document.getElementById('listing')?.classList.remove('hidden');
  const heading=document.getElementById('heading');if(heading)heading.textContent=b.textContent.trim()+' games';
  const status=document.getElementById('status');if(status)status.textContent='Game engine unavailable; no simulated predictions are shown.';
 }));
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(run,1200),{once:true});else setTimeout(run,1200);
})();