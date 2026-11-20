/* V4.9 — homepage league badges; decorative only, retains existing button events. */
(()=>{'use strict';
const leagues=[
 {match:/^NFL$/i,abbr:'NFL',url:'https://a.espncdn.com/i/teamlogos/leagues/500/nfl.png'},
 {match:/^NBA$/i,abbr:'NBA',url:'https://a.espncdn.com/i/teamlogos/leagues/500/nba.png'},
 {match:/NCAA.*Football/i,abbr:'NCAA',url:'https://a.espncdn.com/i/teamlogos/leagues/500/ncaaf.png'},
 {match:/^NHL$/i,abbr:'NHL',url:'https://a.espncdn.com/i/teamlogos/leagues/500/nhl.png'},
 {match:/^MLB$/i,abbr:'MLB',url:'https://a.espncdn.com/i/teamlogos/leagues/500/mlb.png'},
 {match:/^Soccer$/i,abbr:'FIFA',url:'https://upload.wikimedia.org/wikipedia/commons/thumb/a/aa/FIFA_logo_without_slogan.svg/250px-FIFA_logo_without_slogan.svg.png'},
 {match:/^Tennis$/i,abbr:'ATP/WTA',url:'https://a.espncdn.com/i/teamlogos/leagues/500/atp.png'},
 {match:/^UFC$/i,abbr:'UFC',url:'https://upload.wikimedia.org/wikipedia/commons/thumb/9/92/UFC_Logo.svg/320px-UFC_Logo.svg.png'}
];
function update(){
 const nav=document.getElementById('sports');
 if(!nav)return;
 for(const button of nav.querySelectorAll('.sport')){
  if(button.querySelector('.cp-league-label'))continue;
  const label=button.textContent.trim().replace(/^[^\p{L}\p{N}]+/u,'').trim();
  const cfg=leagues.find(x=>x.match.test(label));if(!cfg)continue;
  const old=button.querySelector('em');if(old)old.remove();
  // Preserve the button itself and its existing listeners and data attributes.
  const existing=[...button.childNodes];for(const node of existing)node.remove();
  const img=document.createElement('img');img.className='cp-league-logo';img.alt=cfg.abbr+' logo';img.src=cfg.url;img.loading='lazy';img.referrerPolicy='no-referrer';
  const fallback=document.createElement('span');fallback.className='cp-league-fallback';fallback.textContent=cfg.abbr;fallback.setAttribute('aria-hidden','true');
  img.addEventListener('error',()=>{img.style.display='none';fallback.classList.add('is-visible')},{once:true});
  const text=document.createElement('span');text.className='cp-league-label';text.textContent=label;
  button.append(img,fallback,text);
 }
}
function init(){update();const nav=document.getElementById('sports');if(nav)new MutationObserver(update).observe(nav,{childList:true});}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();