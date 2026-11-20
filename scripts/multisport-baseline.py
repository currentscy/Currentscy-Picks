#!/usr/bin/env python3
"""Conservative multi-sport baseline forecasting from prior completed results.

Not the website's tactical simulator. Explicitly labeled research baseline.
Only forecasts fixtures strictly before scheduled start; no retroactive entries.
"""
import datetime as dt
import json
import math
import os
from pathlib import Path
from validation_dashboard import when

ROOT=Path(__file__).resolve().parents[1]
BASE=ROOT/"research-ledger"
NOW=lambda:dt.datetime.now(dt.timezone.utc)
def load(path,default):
 p=BASE/path
 return json.loads(p.read_text()) if p.exists() else default
def write(path,data):
 p=BASE/path;p.parent.mkdir(parents=True,exist_ok=True)
 tmp=p.with_suffix(".tmp");tmp.write_text(json.dumps(data,indent=2)+"\n");os.replace(tmp,p)
def sides(event):
 teams=event.get("teams") or []
 home=next((t for t in teams if t.get("homeAway")=="home" and t.get("sourceTeamId")),None)
 away=next((t for t in teams if t.get("homeAway")=="away" and t.get("sourceTeamId")),None)
 return home,away
def winner(event):
 if not event.get("completed"):return None
 h,a=sides(event)
 if not h or not a:return None
 try:
  hs=float(h["score"]);az=float(a["score"])
  if not math.isfinite(hs) or not math.isfinite(az) or hs==az:return None
  return int(hs>az)
 except (TypeError,ValueError,KeyError):return None
def rate(team,sport,start,history):
 prior=[]
 for e in history:
  if e.get("sport")!=sport or not e.get("completed"):continue
  t=when(e.get("scheduledStart"))
  observed=when(e.get("firstObservedAt") or e.get("observedAt"))
  if not t or not observed or t>=start or observed>=start:continue
  outcome=winner(e)
  if outcome is None:continue
  h,a=sides(e)
  if h["sourceTeamId"]==team:prior.append((t,outcome))
  elif a["sourceTeamId"]==team:prior.append((t,1-outcome))
 prior.sort(reverse=True,key=lambda x:x[0])
 return [v for _,v in prior[:20]]
def shadow_probability(p,sport):
 config=load(Path("learning/shadow-config.json"),{}).get("models",{}).get(sport)
 if not config:return None,None
 offset=config.get("offset");slope=config.get("slope")
 if type(offset) not in (float,int) or type(slope) not in (float,int):return None,None
 z=offset+slope*math.log(p/(1-p))
 return max(.02,min(.98,1/(1+math.exp(-z)))),config
def forecast(event,history,now):
 start=when(event.get("scheduledStart"))
 if not start or (start-now).total_seconds()<1800 or event.get("completed"):return None
 h,a=sides(event)
 if not h or not a or h["sourceTeamId"]==a["sourceTeamId"]:return None
 # The dedicated NBA shared JS model owns NBA forecasts; never mix formulas.
 sport=event.get("sport")
 if sport in ("nba","ufc","tennis-atp","tennis-wta"):return None
 hw=rate(h["sourceTeamId"],sport,now,history)
 aw=rate(a["sourceTeamId"],sport,now,history)
 if len(hw)<8 or len(aw)<8:return None
 # A transparent, conservative baseline; NOT a calibrated win probability.
 hp=sum(hw);ap=sum(aw)
 strength=lambda w,n:math.log((w+6)/(n-w+6))
 z=.15+.65*(strength(hp,len(hw))-strength(ap,len(aw)))
 p=max(.25,min(.75,1/(1+math.exp(-z))))
 key=event["eventKey"]
 shadow,cal=shadow_probability(p,sport)
 return {"predictionId":"research-home-win:"+key+":prior20-v1","gameKey":key,
  "market":"home-win","entityId":str(h["sourceTeamId"]),"modelVersion":"research-prior20-v1",
  "predictedAt":now.isoformat(),"sourceUrl":event.get("sourceUrl"),
  "baselineProbability":p,"homeTeamId":str(h["sourceTeamId"]),
  "awayTeamId":str(a["sourceTeamId"]),"homeHistoryCount":len(hw),"awayHistoryCount":len(aw),
  "captureMethod":"server-side historical results baseline; NOT website simulation",
  "candidateProbability":None,"shadowProbability":shadow,
  "shadowModelVersion":cal.get("modelVersion") if cal else None,
  "shadowTrainingGames":cal.get("trainedOnCount") if cal else 0,
  "shadowTrainedThrough":cal.get("trainedThrough") if cal else None}
def run(now=None):
 now=now or NOW()
 history=load(Path("unified-events.json"),{}).get("events",[])
 forecasts=load(Path("stage3/pregame-predictions.json"),[])
 outcomes=load(Path("stage3/verified-outcomes.json"),[])
 idx=load(Path("stage3/game-index.json"),{"schemaVersion":1,"games":[]})
 known={p["predictionId"] for p in forecasts}
 settled={o["predictionId"] for o in outcomes}
 index={g["gameKey"]:g for g in idx["games"]}
 newp=newo=0
 for e in history:
  key=e.get("eventKey")
  if not key:continue
  index.setdefault(key,{"gameKey":key,"sport":e.get("sport"),"start":e.get("scheduledStart"),
                        "sourceUrl":e.get("sourceUrl")})
  pred=forecast(e,history,now)
  if pred and pred["predictionId"] not in known:
   forecasts.append(pred);known.add(pred["predictionId"]);newp+=1
 for p in forecasts:
  if p["predictionId"] in settled:continue
  e=next((g for g in history if g.get("eventKey")==p["gameKey"]),None)
  if not e or p.get("market")!="home-win":continue
  y=winner(e)
  if y is None:continue
  start=when(e.get("scheduledStart"))
  observed=when(e.get("lastObservedAt") or e.get("observedAt"))
  if not start or not observed or observed<start:continue
  outcomes.append({"predictionId":p["predictionId"],"result":y,"verified":True,
    "verifiedAt":observed.isoformat(),"sourceUrl":e["sourceUrl"],
    "verificationMethod":"ESPN final scoreboard only; independent provider unverified"})
  settled.add(p["predictionId"]);newo+=1
 idx["games"]=sorted(index.values(),key=lambda x:x["gameKey"])
 write(Path("stage3/game-index.json"),idx)
 write(Path("stage3/pregame-predictions.json"),forecasts)
 write(Path("stage3/verified-outcomes.json"),outcomes)
 print(json.dumps({"newResearchForecasts":newp,"newFinalOutcomes":newo,
                   "totalForecasts":len(forecasts),"totalOutcomes":len(outcomes)}))
if __name__=="__main__":run()
