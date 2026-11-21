/* UFC content isolation: never present football simulations or player props as fight analysis. */
(()=>{'use strict';
const football=/\b(?:Baltimore Ravens|Carolina Panthers|NFL|NCAA Football|receptions|receiving yards|passing yards|rush yds|rec yds|targets|touchdowns|match injury report|5 leg player parlay|sampled win share|average sampled score|tie frequency)\b/i;
const isUfc=()=>{try{if(typeof sport!=='undefined'&&sport==='ufc')return true;}catch(_){}return document.body?.dataset?.sport==='ufc'||/\bUFC\b/i.test(document.getElementById('matchDate')?.textContent||'');};
let busy=false;
function clean(){
 if(!isUfc())return;
 const results=document.getElementById('results');if(!results)return;
 // Preserve fight-native evidence, even when its confidence is low.
 for(const child of [...results.children]){
  if(child.matches('.v48-card')||child.querySelector('.v48-card'))continue;
  const t=child.textContent||'';
  if(football.test(t))child.remove();
 }
 // Some legacy templates nest football cards in the fight detail container.
 const detail=document.getElementById('detail');
 if(detail)for(const node of [...detail.querySelectorAll('section,article,.card')]){
  if(node.closest('.v48-card')||node.querySelector('.v48-card'))continue;
  const heading=node.querySelector('h1,h2,h3,.title')?.textContent||'';
  if(/(?:5 leg player parlay|match injury report|football simulation)/i.test(heading))node.remove();
 }
 // The generic game summary can contain a UFC title but football metrics.
 // Remove only the offending metric tiles, not the entire fight header.
 for(const el of [...document.querySelectorAll('#results .metric,#results .stat,#detail .metric,#detail .stat')]){
  if(el.closest('.v48-card'))continue;
  if(football.test(el.textContent||''))el.remove();
 }
}
function schedule(){if(busy)return;busy=true;queueMicrotask(()=>{busy=false;clean()});}
function init(){const r=document.getElementById('results'),d=document.getElementById('detail');if(r)new MutationObserver(schedule).observe(r,{childList:true,subtree:true});if(d)new MutationObserver(schedule).observe(d,{childList:true,subtree:true});const date=document.getElementById('matchDate');if(date)new MutationObserver(schedule).observe(date,{childList:true,characterData:true,subtree:true});schedule();}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
window.CurrentscyUfcIsolation=Object.freeze({clean});
})();