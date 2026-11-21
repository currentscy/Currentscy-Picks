/* Compact unified Top 5 presentation. Keeps source models and sport pages intact. */
(()=>{'use strict';
const TZ='America/Los_Angeles';
const css=`
#v59WeeklyPanel .row .sub,#v59WeeklyResults>.desc,#v87-daily-three>.v87-three-note{display:none!important}
#v59WeeklyPanel,#v87-daily-three{padding:15px!important}
#v59WeeklyPanel h2,#v87-daily-three h2{font-size:20px!important;line-height:1.2!important}
#v59WeeklyResults,#v87-daily-three{font-size:14px}
.cp-pick{border:1px solid #333945;border-radius:13px;padding:12px;margin:9px 0;background:#141820;color:#eef1f5}
.cp-pick-head{display:flex;align-items:flex-start;gap:10px}
.cp-pick-rank{flex:0 0 27px;display:grid;place-items:center;background:#27211a;color:#e8b96a;border-radius:8px;height:27px;font-weight:800}
.cp-pick-main{min-width:0;flex:1}
.cp-pick-teams{font-size:15px;font-weight:750;line-height:1.35;overflow-wrap:anywhere}
.cp-pick-teams span{font-weight:400;color:#aeb6c3}
.cp-pick-score{color:#e8b96a;font-weight:750;white-space:nowrap;font-size:13px}
.cp-pick-meta{color:#aeb6c3;font-size:12px;margin-top:5px}
.cp-pick-sub{color:#bfc5cf;font-size:12px;margin-top:7px}
.cp-pick details{margin-top:8px;border-top:1px solid #303744;padding-top:8px;font-size:12px;color:#b6bdc9}
.cp-pick summary{cursor:pointer;color:#d8b27b;font-weight:650}
.cp-pick details p{margin:6px 0;line-height:1.5}
#v59WeeklyResults .cp-pick,#v87-daily-three .cp-pick{max-width:100%}
`;
const style=document.createElement('style');style.textContent=css;document.head.appendChild(style);
function text(node){return (node?.textContent||'').trim()}
function pickLine(raw){
 const s=raw.replace(/^\d+\.\s*/,'');
 const i=s.indexOf(' over ');
 return i<0?{winner:s,opponent:'Opponent unavailable'}:{winner:s.slice(0,i),opponent:s.slice(i+6)};
}
function create({rank,winner,opponent,score,date,detail,sport}){
 const card=document.createElement('article');card.className='cp-pick';
 const top=document.createElement('div');top.className='cp-pick-head';
 const badge=document.createElement('div');badge.className='cp-pick-rank';badge.textContent=rank;
 const main=document.createElement('div');main.className='cp-pick-main';
 const teams=document.createElement('div');teams.className='cp-pick-teams';teams.append(document.createTextNode(winner+' '));
 const versus=document.createElement('span');versus.textContent='vs '+opponent;teams.append(versus);
 const meta=document.createElement('div');meta.className='cp-pick-meta';meta.textContent=date||'Pacific game time unavailable';
 const sub=document.createElement('div');sub.className='cp-pick-sub';sub.textContent='Projected score: awaiting verified simulation';
 main.append(teams,meta,sub);
 const metric=document.createElement('div');metric.className='cp-pick-score';metric.textContent=score||'Not ranked';
 top.append(badge,main,metric);card.append(top);
 const details=document.createElement('details');const summary=document.createElement('summary');summary.textContent='Matchup research & verification';details.append(summary);
 const p=document.createElement('p');p.textContent='Current ranking is provisional and is not a calibrated win probability. Position matchups, injuries, projected starters, and a game-specific simulation are not verified by this ranking feed.';details.append(p);
 if(detail){const original=document.createElement('p');original.textContent=detail;details.append(original)}
 const action=document.createElement('p');action.textContent='Select the game in '+sport+' matchups below for available game-level analysis.';details.append(action);card.append(details);
 return card;
}
function transformFootball(){
 const host=document.getElementById('v59WeeklyResults'),panel=document.getElementById('v59WeeklyPanel');
 if(!host||!panel||panel.classList.contains('hidden'))return;
 const sport=document.body.dataset.sport;if(sport!=='nfl'&&sport!=='ncaa')return;
 const legs=[...host.querySelectorAll(':scope > .leg')];
 if(!legs.length)return;
 const fingerprint=sport+'|'+legs.map(text).join('|');
 if(host.dataset.cpFingerprint===fingerprint&&host.querySelector('.cp-pick'))return;
 const cards=legs.slice(0,5).map((leg,i)=>{
  const strong=leg.querySelector('strong'),line=pickLine(text(strong)+(strong?.nextSibling?.textContent||''));
  const raw=text(leg);
  const score=(raw.match(/Rank score\s*([\d.]+)\s*\/100/i)||[])[1];
  const date=(raw.match(/(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun),\s*\w+\s+\d+,?\s*\d+:\d+\s*[AP]M\s*P[DS]T/i)||[])[0]||'';
  return create({rank:i+1,...line,score:score?'Rank '+score+'/100':'Ranking unavailable',date,detail:'Source: '+raw,sport:sport.toUpperCase()});
 });
 host.dataset.cpFingerprint=fingerprint;
 host.replaceChildren(...cards);
}
function transformNBA(){
 const host=document.getElementById('v87-daily-three');
 if(!host||document.body.dataset.sport!=='nba')return;
 const rows=[...host.querySelectorAll(':scope > .v87-three-leg')];if(!rows.length)return;
 const fingerprint=rows.map(text).join('|');if(host.dataset.cpFingerprint===fingerprint)return;
 const cards=rows.slice(0,5).map((row,i)=>{
  const heading=text(row.querySelector('strong')).replace(/\s*·\s*IN PROGRESS \/ STARTED/i,'');
  const line=pickLine(heading);
  const raw=text(row),score=(raw.match(/Ranking score\s*([\d.]+)\s*\/100/i)||[])[1];
  const date=text(row.querySelector('p'));
  const card=create({rank:i+1,...line,score:score?'Rank '+score+'/100':'Ranking unavailable',date,detail:'Source: '+raw,sport:'NBA'});
  if(/IN PROGRESS|STARTED/i.test(raw))card.querySelector('.cp-pick-sub').textContent='Started game · not a pregame forecast · projected score unavailable';
  return card;
 });
 host.dataset.cpFingerprint=fingerprint;
 rows.forEach(x=>x.remove());cards.forEach(x=>host.append(x));
}
let scheduled=false;
function refresh(){if(scheduled)return;scheduled=true;requestAnimationFrame(()=>{scheduled=false;transformFootball();transformNBA()})}
function init(){new MutationObserver(refresh).observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['class','data-sport']});refresh()}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();