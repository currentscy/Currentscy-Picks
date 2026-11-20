#!/usr/bin/env python3
"""Five-gate integrity check for all scheduled events and genuine forecasts."""
import datetime as dt
import json
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
LEDGER=ROOT/"research-ledger"
def read(p,default):
 path=LEDGER/p
 return json.loads(path.read_text()) if path.exists() else default
def when(s):
 try:
  d=dt.datetime.fromisoformat(s.replace("Z","+00:00"))
  return d.astimezone(dt.timezone.utc) if d.tzinfo else None
 except (ValueError,AttributeError):return None
def audit(events,predictions,outcomes,coverage):
 games={e.get("eventKey"):e for e in events if e.get("eventKey")}
 ids=set();invalid=[];valid={}
 for p in predictions:
  if not isinstance(p,dict):invalid.append({"type":"prediction","reason":"not object"});continue
  key=p.get("gameKey");g=games.get(key)
  start=when(g.get("scheduledStart")) if g else None
  predicted=when(p.get("predictedAt"))
  pid=p.get("predictionId")
  prob=p.get("baselineProbability")
  if (not pid or pid in ids or not start or not predicted or predicted>=start or
      type(prob) not in (int,float) or not 0<prob<1):
   invalid.append({"type":"prediction","id":pid,"reason":"missing game, duplicate, invalid probability or post-kickoff"});continue
  ids.add(pid);valid[pid]=p
 scored=set()
 for o in outcomes:
  if not isinstance(o,dict) or o.get("predictionId") not in valid or o.get("predictionId") in scored:
   invalid.append({"type":"outcome","reason":"unmatched or duplicate"});continue
  p=valid[o["predictionId"]];g=games[p["gameKey"]]
  verified=when(o.get("verifiedAt"));start=when(g.get("scheduledStart"))
  if (type(o.get("result")) is not int or o["result"] not in (0,1)
      or not verified or verified<start or not g.get("completed")):
   invalid.append({"type":"outcome","id":o["predictionId"],"reason":"invalid or not final"});continue
  scored.add(o["predictionId"])
 bysport={}
 for g in games.values():
  sport=g.get("sport") or "unknown"
  row=bysport.setdefault(sport,{"events":0,"completed":0,"validForecasts":0,"matchedFinalOutcomes":0})
  row["events"]+=1;row["completed"]+=int(bool(g.get("completed")))
 for pid,p in valid.items():
  sport=games[p["gameKey"]].get("sport") or "unknown"
  bysport[sport]["validForecasts"]+=1
  bysport[sport]["matchedFinalOutcomes"]+=int(pid in scored)
 return {"schemaVersion":1,"generatedAt":dt.datetime.now(dt.timezone.utc).isoformat(),
   "fiveSteps":{"eventCollection":len(games)>0,
    "pregameForecastCaptured":bool(valid),
    "finalOutcomeMatched":bool(scored),
    "researchCoverageReported":bool(coverage.get("sports")),
    "accuracyEvaluationReady":bool(scored) and not invalid},
   "bySport":bysport,"invalidRecords":invalid[:100],
   "validPregameForecasts":len(valid),"matchedFinalOutcomes":len(scored),
   "completeCoverageEstablished":False,
   "liveModelSelfTrainingEnabled":False,
   "note":"A saved fixture is not a forecast. MMA/tennis provider coverage and independent final verification remain unproven."}
def main():
 data=audit(read(Path("unified-events.json"),{}).get("events",[]),
  read(Path("stage3/pregame-predictions.json"),[]),
  read(Path("stage3/verified-outcomes.json"),[]),
  read(Path("unified-coverage.json"),{}))
 path=LEDGER/"validation-dashboard.json"
 path.write_text(json.dumps(data,indent=2)+"\n")
 print(json.dumps({"gates":data["fiveSteps"],"forecasts":data["validPregameForecasts"],"outcomes":data["matchedFinalOutcomes"]}))
if __name__=="__main__":main()
