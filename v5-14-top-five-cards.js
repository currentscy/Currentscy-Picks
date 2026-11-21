/* Compact unified Top 5 presentation. Keeps source models and sport pages intact. */
(()=>{'use strict';
const TZ='America/Los_Angeles';
const css=`
#v59WeeklyPanel,#v87-daily-three{padding:12px!important;margin-top:10px!important}
#v59WeeklyPanel h2,#v87-daily-three h2{font-size:19px!important;line-height:1.2!important;margin:0 0 8px!important}
#v59WeeklyResults,#v87-daily-three{font-size:13px}
#v59WeeklyResults,#v87-daily-three{border-left:0!important;padding-left:0!important}
#v59WeeklyResults>.desc,#v87-daily-three>.v87-three-note,#v59WeeklyPanel .row .sub{display:none!important}
#v59WeeklyResults .cp-pick,#v87-daily-three .cp-pick{max-width:none!important}
.cp-pick{box-sizing:border-box;width:100%;border:1px solid #30343d;border-radius:11px;padding:9px 10px;margin:6px 0;background:#151920;color:#f3f4f6;box-shadow:none}
.cp-pick-head{display:grid;grid-template-columns:23px minmax(0,1fr) 91px;align-items:start;gap:8px}
.cp-pick-rank{width:23px;height:23px;display:grid;place-items:center;background:#292319;color:#e2b46b;border-radius:6px;font-size:12px;font-weight:800}
.cp-pick-main{min-width:0}
.cp-pick-teams{font-size:13px;font-weight:750;line-height:1.22;overflow-wrap:normal;word-break:normal}
.cp-pick-teams span{display:block;font-weight:450;color:#aeb6c3;margin-top:2px}
.cp-pick-score{color:#e8bb74;font-weight:750;font-size:15px;line-height:1.1;text-align:right;white-space:nowrap}
.cp-pick-score small{display:block;font-size:10px;font-weight:500;color:#b9a58a;margin-top:3px}
.cp-pick-meta{color:#aeb6c3;font-size:11px;margin-top:5px;line-height:1.2}
.cp-pick-sub{color:#aeb6c3;font-size:11px;margin-top:5px;line-height:1.2}
.cp-pick details{margin-top:7px;border-top:1px solid #292f39;padding-top:6px;font-size:11px;color:#b6bdc9}
.cp-pick summary{cursor:pointer;color:#d9b782;font-size:11px;font-weight:650;min-height:23px;display:flex;align-items:center}
.cp-pick details p{margin:5px 0;line-height:1.4}
@media(max-width:360px){.cp-pick-head{grid-template-columns:21px minmax(0,1fr) 77px;gap:6px}.cp-pick-score{font-size:13px}.cp-pick-teams{font-size:12px}}
`;
const style=document.createElement('style');style.textContent=css+"\n/* Top-five is a compact ranked list, not five standalone bordered panels. */\n#v59WeeklyResults .cp-pick,#v87-daily-three .cp-pick{background:transparent!important;border:0!important;border-bottom:1px solid #30343d!important;border-radius:0!important;padding:10px 1px!important;margin:0!important;box-shadow:none!important}\n#v59WeeklyResults .cp-pick:last-child,#v87-daily-three .cp-pick:last-child{border-bottom:0!important}\n#v59WeeklyResults,#v87-daily-three{background:transparent!important;border-left:0!important}\n#v59WeeklyResults .cp-pick-head,#v87-daily-three .cp-pick-head{grid-template-columns:23px minmax(0,1fr) 80px!important;gap:7px!important}\n#v59WeeklyResults .cp-pick-teams,#v87-daily-three .cp-pick-teams{font-size:13px!important}\n#v59WeeklyResults .cp-pick-sub,#v87-daily-three .cp-pick-sub{margin-top:4px!important;white-space:normal}\n#v59WeeklyResults .cp-pick details,#v87-daily-three .cp-pick details{margin:3px 0 0 30px!important;padding:3px 0 0!important;border:0!important}\n#v59WeeklyResults .cp-pick details:not([open]) p,#v87-daily-three .cp-pick details:not([open]) p{display:none!important}\n#v59WeeklyResults .cp-pick summary,#v87-daily-three .cp-pick summary{min-height:22px!important}\n";document.head.appendChild(style);
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
 const teams=document.createElement('div');teams.className='cp-pick-teams';teams.append(document.createTextNode(winner));
 const versus=document.createElement('span');versus.textContent='vs '+opponent;teams.append(versus);
 const meta=document.createElement('div');meta.className='cp-pick-meta';meta.textContent=date||'Pacific game time unavailable';
 const sub=document.createElement('div');sub.className='cp-pick-sub';sub.textContent='Simulation pending';
 main.append(teams,meta,sub);
 const metric=document.createElement('div');metric.className='cp-pick-score';const match=(score||'').match(/([\\d.]+)\\/100/);if(match){metric.textContent=match[1];const unit=document.createElement('small');unit.textContent='Rank /100';metric.append(unit)}else metric.textContent=score||'Not ranked';
 top.append(badge,main,metric);card.append(top);
 const details=document.createElement('details');const summary=document.createElement('summary');summary.textContent='Matchup Analysis';details.append(summary);
 const p=document.createElement('p');p.textContent='Ranking is provisional, not a calibrated probability. Open the game below for full model output.';details.append(p);
 
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
  if(/IN PROGRESS|STARTED/i.test(raw))card.querySelector('.cp-pick-sub').textContent='Game started · no pregame simulation';
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