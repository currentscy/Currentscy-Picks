#!/usr/bin/env python3
"""Checkpoint-specific, leakage-aware forecast evaluation. Shadow-only."""
import json,math,datetime as dt
from collections import defaultdict
from pathlib import Path
BASE=Path(__file__).resolve().parents[1]/"research-ledger"
CHECKPOINTS={"early","pregame","interval","injury"}
def timestamp(s):
 try:
  d=dt.datetime.fromisoformat(str(s).replace("Z","+00:00"))
  return d.astimezone(dt.timezone.utc) if d.tzinfo else None
 except (ValueError,TypeError):return None
def score(rows):
 if not rows:return None
 n=len(rows);eps=1e-12
 return {"count":n,"brier":sum((p-y)**2 for p,y in rows)/n,
 "logLoss":-sum(y*math.log(max(eps,p))+(1-y)*math.log(max(eps,1-p)) for p,y in rows)/n,
 "actualWinRate":sum(y for p,y in rows)/n,"meanPredicted":sum(p for p,y in rows)/n}
def evaluate(predictions,outcomes):
 by_outcome={o.get("predictionId"):o for o in outcomes if isinstance(o,dict) and o.get("verified") is True}
 groups=defaultdict(list);rejected=defaultdict(int);seen=set()
 for p in predictions:
  if not isinstance(p,dict):continue
  pid=p.get("predictionId");cp=p.get("checkpoint");sport=p.get("sport")
  if cp not in CHECKPOINTS or not sport or not pid or pid in seen:
   rejected["invalidIdentityOrCheckpoint"]+=1;continue
  seen.add(pid);o=by_outcome.get(pid)
  if not o:continue
  prob=p.get("probability");result=o.get("result")
  observed=timestamp(p.get("predictedAt"));event=timestamp(p.get("eventObservedAt"))
  verified=timestamp(o.get("verifiedAt"));start=timestamp(p.get("scheduledStart"))
  if type(prob) not in (int,float) or not math.isfinite(prob) or not 0<prob<1 or type(result)!=int or result not in (0,1) or not observed or not verified or not start:
   rejected["invalidScoreOrTimestamp"]+=1;continue
  if (cp in ("early","pregame") and observed>=start) or (cp in ("interval","injury") and (observed<start or not event or event>observed)):
   rejected["checkpointTiming"]+=1;continue
  if verified<observed:
   rejected["outcomeBeforeForecast"]+=1;continue
  # A live update is not an eligible pregame forecast.
  groups[(sport,cp)].append((prob,result,p))
 report={}
 for (sport,cp),items in sorted(groups.items()):
  rows=[(p,y) for p,y,_ in items]
  report.setdefault(sport,{})[cp]={"metrics":score(rows),"calibrationBins":[
   {"range":[i/10,(i+1)/10],"metrics":score([(p,y) for p,y in rows if i/10<=p< (i+1)/10 or (i==9 and p==1)])}
   for i in range(10)]}
 # Paired checkpoints on the SAME game only, never compare disjoint samples.
 paired={}
 for sport in report:
  pairs={}
  for cp in ("early","pregame","interval","injury"):
   pairs[cp]={p.get("gameKey"):(prob,y) for (s,c),items in groups.items() if s==sport and c==cp for prob,y,p in items}
  common=set(pairs["early"])&set(pairs["pregame"])
  if common:
   keys=sorted(common);a=score([pairs["early"][k] for k in keys]);b=score([pairs["pregame"][k] for k in keys])
   paired[sport]={"matchedGames":len(keys),"early":a,"pregame":b,"pregameBrierImprovement":a["brier"]-b["brier"]}
 return {"schemaVersion":1,"bySportCheckpoint":report,"pairedEarlyPregame":paired,"rejected":dict(rejected),
 "liveModelPromoted":False,"limitations":"No causal injury/lineup attribution without matched same-state counterfactuals; no model promotion or automatic live deployment."}
def main():
 def load(name):
  try:return json.loads((BASE/name).read_text())
  except (OSError,ValueError):return []
 report=evaluate(load("checkpoints/forecasts.json"),load("checkpoints/outcomes.json"))
 report["generatedAt"]=dt.datetime.now(dt.timezone.utc).isoformat()
 path=BASE/"checkpoints/evaluation.json";path.parent.mkdir(parents=True,exist_ok=True)
 path.write_text(json.dumps(report,indent=2)+"\n")
 print(json.dumps({"sports":list(report["bySportCheckpoint"]),"rejected":report["rejected"]}))
if __name__=="__main__":main()
