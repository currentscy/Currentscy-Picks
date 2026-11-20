/* V2.4 NCAA evidence supplement, Nov 20 2026 ISU at UCF only.
   Sources: kickoffstatus.com (official Big 12 report transcription, 2026-11-19 19:00 PT);
   SI.com/college/ucf matchup reporting 2026-11-19.
   Static dated evidence is NEVER presented as live verified game-day status. */
(()=>{'use strict';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]));
const teams={
 ucf:[
 ['Demari Henderson','DB','Out'],['Horace Lockett','DT','Questionable'],['Jayden Jennings','LB','Questionable'],
 ['DJ Bell','DB','Probable'],['Duke Watson','RB','Probable'],['Waden Charles','WR','Probable'],
 ['Caden Piening','TE','Available'],['Kahmel Johnson','DB','Available']],
 isu:[
 ['Carson Willich','LB','Out'],['Cody Jackson','WR','Out'],['Connor Moberly','QB','Out'],
 ["Ka'Mori Moore",'DT','Out'],['Malcolm Watkins','WR','Out'],['Maasai King','OL','Available']]
};
function gameOK(){
 try{
  const c=chosen?.competitions?.[0]?.competitors||[];
  const names=c.map(x=>String(x.team?.displayName||'').toLowerCase()).join(' ');
  return sport==='ncaa'&&/iowa state/.test(names)&&/ucf/.test(names)&&String(chosen.date||'').slice(0,10)==='2026-11-20';
 }catch{return false}
}
const source='https://kickoffstatus.com/games/2026-11-20-iowa-state-at-ucf/';
function injury(){
 const slot=document.getElementById('v22-ncaa-availability');if(!slot||!slot.textContent.includes('NCAA match injury report'))return;
 const cards=[...slot.querySelectorAll('.v23-ncaa-injury>details')];if(cards.length!==2)return;
 for(const card of cards){
  const k=/ucf/i.test(card.querySelector('summary')?.textContent||'')?'ucf':'isu';
  const rows=teams[k];
  const summary=card.querySelector('summary');if(summary){const label=(k==='ucf'?'UCF Knights':'Iowa State Cyclones')+' · '+rows.length+' named statuses · Tap to expand';if(summary.textContent!==label)summary.textContent=label;}
  let body=card.querySelector('.v24-sourced-injuries');
  if(!body){body=document.createElement('div');body.className='v24-sourced-injuries';card.append(body)}
  const markup=rows.map(x=>'<div><strong>'+esc(x[0])+'</strong> · '+esc(x[1])+' · <b>'+esc(x[2])+'</b></div>').join('');
  if(body.dataset.key!==k){body.innerHTML=markup+'<p class="desc">Published Big 12 availability report, updated Nov 19, 7 PM PT. Not a live game-day confirmation.</p>';body.dataset.key=k}
  for(const p of card.querySelectorAll(':scope>p'))p.style.display='none';
 }
 let note=slot.querySelector('.v24-injury-source');
 if(!note){note=document.createElement('p');note.className='desc v24-injury-source';note.innerHTML='Named statuses from <a href="'+source+'" target="_blank" rel="noopener noreferrer">published Big 12 availability report transcription</a>. This is a dated matchup snapshot, not a live feed. The ESPN injury endpoint returned no names; do not treat missing names as healthy.';slot.append(note)}
}
function playerNotes(name,team,kind){
 const ucf=/ucf/i.test(team);
 if(ucf){
  if(/reception|receiving/i.test(kind))return 'UCF passing matchup vs Iowa State: likely outside corner candidates include David Coffey and Keyon Washington; Seth Johnson is listed at nickel. A specific man-to-man assignment or zone coverage rotation is not confirmed. The target must earn snaps and routes against those coverage groups; Iowa State linebacker Carson Willich is listed out, potentially affecting underneath zone responsibilities, but no coverage effect is verified.';
  if(/rush/i.test(kind))return 'UCF rushing matchup vs Iowa State: linebacker Carson Willich is listed out, which may change run fits and second-level tackling. Sullivan Schlimgen remains a key listed linebacker; exact run fits, box counts, and replacements are not verified. Duke Watson is listed probable, so touches are not guaranteed.';
  return 'UCF offense faces Iowa State personnel changes, including linebacker Carson Willich out. Specific defender assignments and offensive usage remain unconfirmed.';
 }
 if(/rush/i.test(kind))return 'Iowa State rushing matchup vs UCF: defensive tackle Horace Lockett and linebacker Jayden Jennings are listed questionable. Their participation could affect interior run fits and second-level pursuit. This favors investigating rushing lanes, but the exact front, blocking assignments, and snap counts are unverified.';
 if(/reception|receiving/i.test(kind))return 'Iowa State receiving matchup vs UCF: defensive back Demari Henderson is listed out; Caleb Flagg has started in his place in recent games. DJ Bell is listed probable and Kahmel Johnson available, potentially changing the secondary rotation. A specific corner or nickel assigned to this receiver is not confirmed; man/zone coverage and route alignment determine who actually guards him.';
 return 'Iowa State passing matchup vs UCF: Demari Henderson is out and the defensive back rotation has changed. No verified individual coverage assignment or coverage-call frequency is available.';
}
function players(){
 const panel=document.querySelector('#v68NcaaFive .v23-five');if(!panel)return;
 for(const leg of panel.querySelectorAll('.v23-leg')){
  const heading=leg.querySelector('h3')?.textContent||'';
  const team=leg.querySelector('.desc')?.textContent||'';
  const kind=heading.toLowerCase();
  const existing=leg.querySelector('.v24-matchup-evidence');
  if(existing)continue;
  const node=document.createElement('p');node.className='v24-matchup-evidence desc';
  node.textContent=playerNotes(heading,team,kind);
  const details=leg.querySelector('.v24-player-extra')||leg.querySelector('details');
  if(details)details.append(node);else leg.append(node);
 }
 let note=panel.querySelector('.v24-player-evidence-note');
 if(!note){note=document.createElement('p');note.className='desc v24-player-evidence-note';note.innerHTML='Matchup notes use <a href="'+source+'" target="_blank" rel="noopener noreferrer">dated availability evidence</a> and <a href="https://www.si.com/college/ucf/football/ucf-knights-senior-demari-henderson-ruled-out-for-senior-knight-vs-iowa-state-cyclones-injury-report-breakdown-duke-watson-scott-frost-01m7nzqzvqdc" target="_blank" rel="noopener noreferrer">local personnel reporting</a>. Named defender assignments, scheme usage, player activation and matchup-adjusted probabilities are not verified.';panel.append(note)}
}
let queued=false;
function run(){if(!gameOK())return;injury();players()}
function schedule(){if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;run()})}
function init(){const d=document.getElementById('detail');if(d)new MutationObserver(schedule).observe(d,{childList:true,subtree:true});schedule()}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();