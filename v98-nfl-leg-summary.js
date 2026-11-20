/* Currentscy Picks V98 — concise, per-player NFL leg evidence. */
(()=>{'use strict';
const text=el=>(el?.textContent||'').replace(/\s+/g,' ').trim();
function numberFrom(s,label){const m=s.match(new RegExp(label+'\\s*:\\s*([0-9,]+)','i'));return m?Number(m[1].replace(/,/g,'')):null}
function refresh(){
 const headings=[...document.querySelectorAll('h1,h2,h3')].filter(h=>/5 Leg Player Parlay/i.test(text(h)));
 for(const heading of headings){
  const panel=heading.closest('.panel')||heading.parentElement;
  if(!panel)continue;
  for(const p of panel.querySelectorAll('p.desc')){
   if(/injury feed checked/i.test(text(p)))p.remove();
  }
  const cards=[...panel.querySelectorAll('.v65leg.v78-leg')];
  for(const card of cards){
   const headingText=text(card.querySelector('strong'));
   const match=headingText.match(/^\d+\.\s*(.*?)\s*[—–-]\s*(\d+)\+\s*(receiving yards|receptions|rushing yards|passing yards|pass yards)/i);
   if(!match)continue;
   const name=match[1],threshold=Number(match[2]),metric=match[3].toLowerCase();
   const games=text(card).match(/(\d+)\s+verified games in sample/i);
   const hit=text(card).match(/(\d+)\s*\/\s*(\d+)\s+hits/i);
   const rec=numberFrom(text(card),'Rec yds'),targets=numberFrom(text(card),'Targets'),
     receptions=numberFrom(text(card),'Receptions'),rush=numberFrom(text(card),'Rush yds'),
     passing=numberFrom(text(card),'Pass yds');
   const n=games?Number(games[1]):hit?Number(hit[2]):0;
   const relevant=metric==='receptions'?receptions:metric==='receiving yards'?rec:metric==='rushing yards'?rush:passing;
   const avg=Number.isFinite(relevant)&&n>0?(relevant/n).toFixed(1):null;
   const targetAvg=Number.isFinite(targets)&&n>0?(targets/n).toFixed(1):null;
   const hitPhrase=hit?hit[1]+' of '+hit[2]+' sampled games':'recent completed games';
   let driver='';
   if(metric==='receptions')driver=targetAvg?name+' averaged '+targetAvg+' recorded targets per sampled game, a direct opportunity signal for receptions.':'Receptions depend on targets and offensive passing volume.';
   else if(metric==='receiving yards')driver=targetAvg?name+' averaged '+targetAvg+' recorded targets per sampled game, supporting receiving-yard opportunities.':'Receiving yards depend on targets, routes and downfield usage.';
   else if(metric==='rushing yards')driver='Rushing opportunities depend on carries, offensive line blocking and defensive front.';
   else driver='Passing production depends on attempt volume, protection and coverage.';
   let summary=hitPhrase+' reached '+threshold+'+ '+metric+'. '+(avg?'The recorded sample averages '+avg+' '+metric+' per game. ':'')+driver+
    ' Opponent scheme, direct defender assignment and game-day availability are not yet verified; this is historical evidence, not a confirmed matchup edge.';
   let box=card.querySelector('.v98-player-reason');
   if(!box){
    card.querySelector('.v97-matchup-note')?.remove();
    box=document.createElement('div');box.className='v98-player-reason';
    box.style.cssText='border-left:3px solid #c8a15e;padding:10px 12px;margin:14px 0;background:rgba(200,161,94,.07);border-radius:0 8px 8px 0;line-height:1.55';
    const title=document.createElement('strong');title.textContent='Why '+name+' could hit this leg';
    const body=document.createElement('p');body.style.cssText='margin:6px 0 0;color:#d7dde8;font-size:.93rem';
    box.append(title,body);
    const stats=card.querySelector('.v78-stats');
    if(stats)stats.insertAdjacentElement('afterend',box);else card.append(box);
   }
   const body=box.querySelector('p');if(body&&body.textContent!==summary)body.textContent=summary;
  }
 }
}
let scheduled=false;
function schedule(){if(scheduled)return;scheduled=true;setTimeout(()=>{scheduled=false;refresh()},150)}
function init(){refresh();new MutationObserver(schedule).observe(document.body,{childList:true,subtree:true})}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();