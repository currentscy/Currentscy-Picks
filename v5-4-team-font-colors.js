/* V5.4: team-color typography from the selected ESPN event, no simulation changes. */
(()=>{'use strict';
function tint(team){const hex=String(team?.color||'').replace(/^#/,'');if(!/^[0-9a-f]{6}$/i.test(hex))return '';const n=[0,2,4].map(i=>parseInt(hex.slice(i,i+2),16));const a=n.map(v=>Math.round(v*.68+255*.32));return '#'+a.map(v=>v.toString(16).padStart(2,'0')).join('')}
function paint(root,teams){if(!root||!teams.length)return;for(const label of root.querySelectorAll('.team-label')){const name=label.textContent.trim();const t=teams.find(t=>name===t.displayName||name===t.name||name===t.shortDisplayName);if(!t)continue;const color=tint(t);if(color)label.style.setProperty('color',color)}}
let pending=false;
function update(){if(document.body.dataset.sport==='home')return;try{
 const selected=typeof chosen!=='undefined'?chosen:null;
 paint(document.getElementById('matchTitle'),selected?.competitions?.[0]?.competitors?.map(c=>c.team).filter(Boolean)||[]);
 const all=typeof events!=='undefined'?events:[];
 for(const btn of document.querySelectorAll('.game[data-i]')){const event=all[Number(btn.dataset.i)];if(!event)continue;paint(btn,event.competitions?.[0]?.competitors?.map(c=>c.team).filter(Boolean)||[])}
 }catch(e){}}
function schedule(){if(pending)return;pending=true;requestAnimationFrame(()=>{pending=false;update()})}
function start(){schedule();new MutationObserver(schedule).observe(document.body,{childList:true,subtree:true})}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();