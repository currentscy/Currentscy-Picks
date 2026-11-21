#!/usr/bin/env python3
"""Settle previously archived home-win forecasts from observed final scoreboards.
No retrospective predictions, no edits to forecasts, and no synthetic results.
A source-final result is NOT independent multi-provider verification.
"""
import datetime as dt
import json
from pathlib import Path
from stage3_evaluate import instant
BASE=Path(__file__).resolve().parents[1]/"research-ledger"
def read(name,default):
 p=BASE/name
 try:return json.loads(p.read_text())
 except (OSError,ValueError):return default
def extract(events,predictions,existing,now=None):
 now=now or dt.datetime.now(dt.timezone.utc)
 by={e.get("eventKey"):e for e in events if isinstance(e,dict) and e.get("eventKey")}
 seen={o.get("predictionId") for o in existing if isinstance(o,dict)}
 results=[];skipped={}
 for p in predictions:
  if not isinstance(p,dict):continue
  pid=p.get("predictionId")
  if not pid or pid in seen or p.get("market")!="home-win":continue
  e=by.get(p.get("gameKey"))
  if not e or e.get("completed") is not True:continue
  start=instant(e.get("scheduledStart"));saved=instant(p.get("predictedAt"))
  if not start or not saved or saved>=start or now<start:continue
  teams=e.get("teams") or []
  home=next((x for x in teams if x.get("homeAway")=="home"),None)
  away=next((x for x in teams if x.get("homeAway")=="away"),None)
  if not home or not away:continue
  # If forecast carries team IDs, verify side identity before settlement.
  if p.get("homeTeamId") and str(p["homeTeamId"])!=str(home.get("sourceTeamId")):continue
  if p.get("awayTeamId") and str(p["awayTeamId"])!=str(away.get("sourceTeamId")):continue
  try:
   hs=float(home["score"]);a=float(away["score"])
  except (ValueError,TypeError,KeyError):continue
  if not all(map(lambda n:n==n and abs(n)<1e6,(hs,a))):continue
  # A soccer draw is not a binary home-win market; require a separate draw-aware model.
  if hs==a:continue
  url=e.get("sourceUrl")
  if not isinstance(url,str) or not url.startswith("https://"):continue
  observed=instant(e.get("observedAt"))
  if not observed or observed<start or observed>now+dt.timedelta(minutes=5):continue
  results.append({"predictionId":pid,"result":int(hs> a),"verified":True,
   "verifiedAt":observed.isoformat(),"sourceUrl":url,
   "verificationMethod":"ESPN scoreboard marked completed; single-provider final, not independently corroborated",
   "homeScore":hs,"awayScore":a})
  seen.add(pid)
 return results
def main():
 forecasts=read("stage3/pregame-predictions.json",[])
 existing=read("stage3/verified-outcomes.json",[])
 sources=[read("stage1/latest.json",{}),read("unified-events.json",{})]
 events={}
 # Prefer freshest observed completed record; do not overwrite existing outcomes.
 for source in sources:
  for e in source.get("events",[]):
   if not isinstance(e,dict) or not e.get("eventKey"):continue
   prev=events.get(e["eventKey"])
   if not prev or (e.get("completed") is True and prev.get("completed") is not True) or (
    e.get("completed")==prev.get("completed") and str(e.get("observedAt",""))>str(prev.get("observedAt",""))):
    events[e["eventKey"]]=e
 new=extract(events.values(),forecasts,existing)
 if new:
  p=BASE/"stage3/verified-outcomes.json"
  tmp=p.with_suffix(".tmp");tmp.write_text(json.dumps(existing+new,indent=2)+"\n");tmp.replace(p)
 print(json.dumps({"newSettlements":len(new),"totalOutcomes":len(existing)+len(new),"availableFinalEvents":sum(e.get("completed") is True for e in events.values())}))
if __name__=="__main__":main()
