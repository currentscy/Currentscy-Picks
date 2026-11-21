#!/usr/bin/env python3
"""Evidence-first integration report for every research/forecast/AI layer.

Only reports observed outputs. Never fabricates successful model activation.
"""
import datetime as dt
import json
import os
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]/"research-ledger"
UTC=dt.timezone.utc
def load(name):
 try:return json.loads((ROOT/name).read_text())
 except (FileNotFoundError,ValueError):return None
def date(s):
 try:
  v=dt.datetime.fromisoformat(s.replace("Z","+00:00"))
  return v.astimezone(UTC) if v.tzinfo else None
 except (AttributeError,ValueError):return None
def status(name,filename,timestamp,now,ttl):
 data=load(filename)
 if data is None:return {"name":name,"state":"missing","path":filename}
 observed=date(data.get(timestamp))
 if name=="stage5" and not observed:
  entries=data.get("entries",[])
  observed=max((d for x in entries if isinstance(x,dict) for d in [date(x.get("sourceObservedAt"))] if d),default=None)
 if not observed:return {"name":name,"state":"invalid-timestamp","path":filename}
 age=(now-observed).total_seconds()/3600
 return {"name":name,"state":"ready" if -1<=age<=ttl else "stale",
   "path":filename,"updatedAt":observed.isoformat(),"ageHours":round(age,2)}
def build(now=None):
 now=now or dt.datetime.now(UTC)
 definitions=[
  ("stage1","stage1/latest.json","collectedAt",12),
  ("stage2","stage2/latest.json","generatedAt",12),
  ("stage3","stage3/evaluation.json","generatedAt",2),
  ("stage4","stage4/report.json","generatedAt",12),
  ("stage5","stage5/manifest.json","sourceObservedAt",12),
  ("eventLedger","unified-events.json","updatedAt",12),
  ("coverage","unified-coverage.json","updatedAt",12),
  ("validation","validation-dashboard.json","generatedAt",2),
  ("learning","learning/report.json","generatedAt",2),
  ("forecastComparison","forecast-vs-results.json","generatedAt",2),
  ("researchConsistency","feedback-health.json","asOf",12),
  ("ai","ai/latest.json","generatedAt",2)]
 layers={k:status(k,p,t,now,h) for k,p,t,h in definitions}
 predictions=load("stage3/pregame-predictions.json") or []
 outcomes=load("stage3/verified-outcomes.json") or []
 evaluation=load("stage3/evaluation.json") or {}
 learning=load("learning/report.json") or {}
 ai=load("ai/latest.json") or {}
 workflow=load("workflow-verification.json") or {}
 layers["ai"]["state"]=("connected" if ai.get("aiEnabled") is True and ai.get("status")=="ai-analysis-complete"
  else "api-error" if ai.get("status")=="ai-unavailable"
  else "not-configured" if ai.get("status")=="awaiting-server-api-key"
  else layers["ai"]["state"])
 layers["ai"]["error"]=ai.get("error")
 return {"schemaVersion":1,"generatedAt":now.isoformat(),"layers":layers,
  "metrics":{"savedForecasts":len(predictions),"savedOutcomes":len(outcomes),
   "scoredForecasts":(evaluation.get("summary") or {}).get("scoredBaselinePredictions",0),
   "shadowLearningScored":learning.get("scoredPredictions",0),
   "aiResponding":layers["ai"]["state"]=="connected"},
  "workflow":{"runId":workflow.get("runId"),"lastStatus":workflow.get("jobStatusAtCheckpoint")},
  "allLayersHealthy":all(x["state"] in ("ready","connected") for x in layers.values()),
  "endToEndScoringVerified":(evaluation.get("summary") or {}).get("scoredBaselinePredictions",0)>0,
  "automaticProductionModelUpdates":False,
  "note":"A layer marked ready means a fresh report exists, not that its underlying data or model is accurate."}
def main():
 result=build()
 p=ROOT/"integration-health.json";p.parent.mkdir(parents=True,exist_ok=True)
 tmp=p.with_suffix(".tmp");tmp.write_text(json.dumps(result,indent=2)+"\n");os.replace(tmp,p)
 print(json.dumps({"healthy":result["allLayersHealthy"],"metrics":result["metrics"],
   "issues":{k:v["state"] for k,v in result["layers"].items() if v["state"] not in ("ready","connected")}}))
if __name__=="__main__":main()
