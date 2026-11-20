#!/usr/bin/env python3
"""Walk-forward probability calibration using ONLY genuine archived pregame predictions.

This is an offline learning layer: fitted candidates remain shadow-only until
sufficient chronological out-of-sample evidence supports an explicit release.
No outcomes or original forecasts are rewritten.
"""
import datetime as dt
import json
import math
import os
from collections import defaultdict
from pathlib import Path
from stage3_evaluate import instant, score

ROOT=Path(__file__).resolve().parents[1]
BASE=ROOT/"research-ledger"
OUTPUT=BASE/"learning"/"report.json"
MIN_TRAIN=60
MIN_HOLDOUT=30
MIN_PROMOTION=200
def clamp(x):return max(.02,min(.98,x))
def logit(p):return math.log(p/(1-p))
def sigmoid(z):return 1/(1+math.exp(-max(-30,min(30,z))))
def transform(p,offset,slope):return clamp(sigmoid(offset+slope*logit(p)))
def fit(rows):
 # Regularized two-parameter Platt-style grid, fit on training outcomes only.
 # Deterministic and intentionally constrained to avoid wild adjustments.
 best=(float("inf"),0.,1.)
 for offset in (-.4,-.3,-.2,-.1,0,.1,.2,.3,.4):
  for slope in (.6,.7,.8,.9,1.,1.1,1.2):
   loss=sum((transform(p,offset,slope)-y)**2 for p,y in rows)/len(rows)
   loss+=.001*(offset*offset+(slope-1)**2)
   if loss<best[0]:best=(loss,offset,slope)
 return {"offset":best[1],"slope":best[2]}
def eligible(games,predictions,outcomes):
 indexed={g.get("gameKey"):g for g in games if isinstance(g,dict)}
 finals={o.get("predictionId"):o for o in outcomes if isinstance(o,dict) and
   o.get("verified") is True and type(o.get("result")) is int and o.get("result") in (0,1) and
   str(o.get("sourceUrl","")).startswith("https://") and instant(o.get("verifiedAt"))}
 rows=[];seen=set()
 for p in predictions:
  if not isinstance(p,dict):continue
  pid=p.get("predictionId");g=indexed.get(p.get("gameKey"));o=finals.get(pid)
  if not pid or pid in seen or not g or not o:continue
  start=instant(g.get("start") or g.get("scheduledStart"))
  before=instant(p.get("predictedAt"));after=instant(o.get("verifiedAt"))
  probability=p.get("baselineProbability")
  if not start or not before or not after or before>=start or after<start or type(probability) not in (int,float) or not math.isfinite(probability) or not 0<probability<1:continue
  seen.add(pid)
  rows.append({"id":pid,"gameKey":p["gameKey"],"sport":g.get("sport") or p["gameKey"].split(":")[0],
   "modelVersion":p.get("modelVersion"),"kickoff":start.isoformat(),
   "probability":probability,"result":o["result"],
   "shadowProbability":p.get("shadowProbability") if type(p.get("shadowProbability")) in (int,float) and 0<p["shadowProbability"]<1 else None})
 return sorted(rows,key=lambda r:(r["kickoff"],r["id"]))
def analyze(rows):
 groups=defaultdict(list)
 for row in rows:groups[row["sport"]].append(row)
 report={}
 for sport,items in sorted(groups.items()):
  n=len(items);cut=max(0,n-MIN_HOLDOUT)
  train=items[:cut];test=items[cut:]
  shadow_rows=[x for x in items if x.get("shadowProbability") is not None]
  entry={"n":n,"trainCount":len(train),"holdoutCount":len(test),
    "actualArchivedShadow":{"n":len(shadow_rows),
      "baseline":score([(x["probability"],x["result"]) for x in shadow_rows]),
      "shadow":score([(x["shadowProbability"],x["result"]) for x in shadow_rows])},
    "originalBrier":score([(x["probability"],x["result"]) for x in items]),
    "candidate":None,"holdout":None,"promotionEligible":False,
    "activeAdjustment":None}
  if len(train)>=MIN_TRAIN and len(test)>=MIN_HOLDOUT:
   params=fit([(x["probability"],x["result"]) for x in train])
   original=score([(x["probability"],x["result"]) for x in test])
   candidate=score([(transform(x["probability"],**params),x["result"]) for x in test])
   improves=candidate["brier"]+0.005<original["brier"] and candidate["logLoss"]+0.005<original["logLoss"]
   entry["candidate"]=params
   entry["holdout"]={"baseline":original,"candidate":candidate,"improvesBoth":improves,
      "holdoutGameKeys":[x["gameKey"] for x in test]}
   entry["promotionEligible"]=n>=MIN_PROMOTION and improves
  report[sport]=entry
 return report
def load(name,default):
 path=BASE/name
 return json.loads(path.read_text()) if path.exists() else default
def main():
 index=load("stage3/game-index.json",{}).get("games",[])
 observed=load("unified-events.json",{}).get("events",[])
 by={g.get("gameKey"):g for g in index}
 for e in observed:
  k=e.get("eventKey")
  if k and k not in by:by[k]={"gameKey":k,"sport":e.get("sport"),"start":e.get("scheduledStart")}
 rows=eligible(list(by.values()),load("stage3/pregame-predictions.json",[]),
               load("stage3/verified-outcomes.json",[]))
 report={"schemaVersion":1,"generatedAt":dt.datetime.now(dt.timezone.utc).isoformat(),
  "scoredPredictions":len(rows),"bySport":analyze(rows),
  "liveCalibrationActivated":False,"automaticRetrainingDeployed":False,
  "releaseGate":"Shadow model only. Requires >=200 scored forecasts per sport, >=30 chronological holdout results, improved Brier AND log loss, independent provenance review and explicit versioned release.",
  "limitations":"Source-verified ESPN finals are not independent multi-provider verification; no prediction is backfilled or modified."}
 OUTPUT.parent.mkdir(parents=True,exist_ok=True)
 # Candidate adjustments are automatically refitted from previously scored
 # games. They are shadow-only, never a retroactive change to saved forecasts.
 shadow={"schemaVersion":1,"generatedAt":report["generatedAt"],"models":{}}
 for sport,items in report["bySport"].items():
  if items["candidate"] and items["holdout"] and items["holdout"]["improvesBoth"]:
   used=[x for x in rows if x["sport"]==sport]
   latest=max(x["kickoff"] for x in used)
   shadow["models"][sport]={"offset":items["candidate"]["offset"],
    "slope":items["candidate"]["slope"],"trainedOnCount":items["trainCount"],
    "holdoutCount":items["holdoutCount"],"trainedThrough":latest,
    "modelVersion":"shadow-platt-grid-v1","notLive":True}
 shadowpath=OUTPUT.parent/"shadow-config.json"
 shadowtmp=shadowpath.with_suffix(".tmp")
 shadowtmp.write_text(json.dumps(shadow,indent=2)+"\n")
 os.replace(shadowtmp,shadowpath)
 temp=OUTPUT.with_suffix(".tmp");temp.write_text(json.dumps(report,indent=2)+"\n");os.replace(temp,OUTPUT)
 print(json.dumps({"scored":len(rows),"sports":{k:v["n"] for k,v in report["bySport"].items()}}))
if __name__=="__main__":main()
