/* V87 player-specific research: contextualizes each leg using its own displayed statistics. */
(()=>{'use strict';
const tidy=s=>String(s||'').replace(/\s+/g,' ').trim();
function update(){
 const d=document.getElementById('detail');
 if(!d||d.classList.contains('hidden')||!/\bNBA\b/i.test(document.getElementById('matchDate')?.textContent||''))return;
 const title=tidy(document.getElementById('matchTitle')?.textContent);
 const teams=title.split(/\s+vs\.?\s+/i).map(tidy);
 for(const summary of d.querySelectorAll('summary')){
  if(!/^Matchup research$/i.test(tidy(summary.textContent)))continue;
  const details=summary.closest('details'),box=details?.querySelector('.v84-research');
  if(!box||details.classList.contains('v87-has-data'))continue;
  const panel=details.closest('.panel');if(!panel)continue;
  let leg=details.parentElement;
  while(leg&&leg!==panel&&!/\b\d+\.\s+[^\n]+\s+[—–-]\s+\d+\+/.test(tidy(leg.textContent).slice(0,180)))leg=leg.parentElement;
  if(!leg||leg===panel)continue;
  const header=[...leg.querySelectorAll('h3,h4,strong,b')].find(e=>/^\d+\.\s+.+[—–-]\s+\d+\+/.test(tidy(e.textContent)));
  const label=tidy(header?.textContent)||tidy(leg.textContent).slice(0,180);
  const match=label.match(/^\d+\.\s+(.+?)\s+[—–-]\s+(\d+)\+\s+(points|rebounds|assists|threes|3-pointers|three-pointers|free throws)/i);
  if(!match)continue;
  const [,name,threshold,stat]=match;
  const text=tidy(leg.textContent);
  const intro=tidy(leg.textContent).slice(0,260);
  const ownLine=intro.slice(label.length).trim();
  const team=teams.find(t=>ownLine.startsWith(t))||teams.find(t=>ownLine.includes(t))||'';
  const opponent=teams.find(t=>t!==team)||'the opponent';
  const hit=text.match(/(\d+)\s*\/\s*(\d+)\s*hits/i)||text.match(/cleared\s+[^.]+?\s+in\s+(\d+)\s+of\s+(\d+)/i);
  const minutes=text.match(/(\d+(?:\.\d+)?)\s+projected minutes/i);
  const metrics={};
  for(const m of text.matchAll(/(PTS\/G|REB\/G|AST\/G|3PM\/G|FTM\/G|MIN\/G)\s*(\d+(?:\.\d+)?)/gi))metrics[m[1].toUpperCase()]=Number(m[2]);
  const key=/point/i.test(stat)?'PTS/G':/rebound/i.test(stat)?'REB/G':/assist/i.test(stat)?'AST/G':/three|3-point/i.test(stat)?'3PM/G':'FTM/G';
  const parts=[];
  parts.push(name+' faces '+opponent+' with a '+threshold+'+ '+stat.toLowerCase()+' target.');
  if(metrics[key]!==undefined)parts.push('In the available sample, '+name+' averages '+metrics[key].toFixed(1)+' '+stat.toLowerCase()+' per game.');
  if(hit)parts.push('This threshold was reached in '+hit[1]+' of '+hit[2]+' recorded appearances; that is a historical sample, not a predicted probability.');
  if(minutes)parts.push('The current model estimates '+Number(minutes[1]).toFixed(1)+' minutes, which influences opportunity.');
  if(key==='PTS/G'&&metrics['3PM/G']!==undefined&&metrics['FTM/G']!==undefined)parts.push('Scoring profile: '+metrics['3PM/G'].toFixed(1)+' made threes and '+metrics['FTM/G'].toFixed(1)+' made free throws per recorded game; these are different ways to reach the scoring target.');
  if(key==='AST/G')parts.push('Assist production depends on teammates converting created shots, not just the player’s own usage.');
  if(key==='REB/G')parts.push('Rebounding opportunities depend on missed shots, position and playing time.');
  if(key==='3PM/G')parts.push('Three-point results depend on shot volume and perimeter coverage, neither of which is verified for this matchup.');
  parts.push('Specific '+opponent+' defender assignments and defensive weaknesses are not verified by the connected feeds, so a favorable individual matchup cannot be claimed.');
  const result=parts.join(' ');
  if(box.textContent!==result)box.textContent=result;
 }
}
let queued=false;function schedule(){if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;update()})}
function start(){schedule();new MutationObserver(schedule).observe(document.body,{childList:true,subtree:true})}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();