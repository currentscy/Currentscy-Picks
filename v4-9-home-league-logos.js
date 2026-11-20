/* V4.9 — homepage league badges; decorative only, retains existing button events. */
(()=>{'use strict';
const leagues=[
 {match:/^NFL$/i,abbr:'NFL',url:'https://a.espncdn.com/i/teamlogos/leagues/500/nfl.png'},
 {match:/^NBA$/i,abbr:'NBA',url:'https://a.espncdn.com/i/teamlogos/leagues/500/nba.png'},
 {match:/NCAA.*Football/i,abbr:'NCAA',url:null,emoji:'🏈'},
 {match:/^NHL$/i,abbr:'NHL',url:'https://a.espncdn.com/i/teamlogos/leagues/500/nhl.png'},
 {match:/^MLB$/i,abbr:'MLB',url:'https://a.espncdn.com/i/teamlogos/leagues/500/mlb.png'},
 {match:/^Soccer$/i,abbr:'FIFA',url:'https://upload.wikimedia.org/wikipedia/commons/thumb/a/aa/FIFA_logo_without_slogan.svg/250px-FIFA_logo_without_slogan.svg.png'},
 {match:/^Tennis$/i,abbr:'ATP/WTA',url:null,emoji:'🎾'},
 {match:/^UFC$/i,abbr:'UFC',url:null,emoji:'🥊'}
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
  const img=document.createElement('img');img.className='cp-league-logo';img.alt=cfg.abbr+' logo';if(cfg.url)img.src=cfg.url;img.loading='lazy';img.referrerPolicy='no-referrer';
  const fallback=document.createElement('span');fallback.className='cp-league-fallback';fallback.textContent=cfg.emoji||cfg.abbr;fallback.setAttribute('aria-hidden','true');
  img.addEventListener('error',()=>{img.style.display='none';fallback.classList.add('is-visible')},{once:true});
  const text=document.createElement('span');text.className='cp-league-label';text.textContent=label;
  if(cfg.emoji){img.remove();fallback.classList.add('is-visible');}button.append(...(cfg.emoji?[]:[img]),fallback,text);
 }
}
function init(){update();const nav=document.getElementById('sports');if(nav)new MutationObserver(update).observe(nav,{childList:true});}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();