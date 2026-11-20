#!/usr/bin/env python3
"""Record what this GitHub Actions run actually accomplished; never fake success."""
import datetime as dt
import json
import os
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]/"research-ledger"
def load(name,default):
 p=ROOT/name
 try:return json.loads(p.read_text())
 except FileNotFoundError:return default
def main():
 workflow=os.getenv("GITHUB_WORKFLOW","local")
 job_status=os.getenv("WORKFLOW_JOB_STATUS","unknown")
 data=load("unified-events.json",{})
 predictions=load("stage3/pregame-predictions.json",[])
 outcomes=load("stage3/verified-outcomes.json",[])
 validation=load("validation-dashboard.json",{})
 coverage=load("unified-coverage.json",{})
 stage1=load("stage1/latest.json",{})
 status={"schemaVersion":1,"checkedAt":dt.datetime.now(dt.timezone.utc).isoformat(),
  "workflow":workflow,"runId":os.getenv("GITHUB_RUN_ID"),"runAttempt":os.getenv("GITHUB_RUN_ATTEMPT"),
  "jobStatusAtCheckpoint":job_status,
  "sourceRequestsSucceeded":stage1.get("summary",{}).get("successfulRequests",0),
  "sourceRequestsFailed":stage1.get("summary",{}).get("failedRequests",0),
  "savedEvents":len(data.get("events",[])),
  "savedPregameForecasts":len(predictions),
  "savedFinalOutcomes":len(outcomes),
  "validPregameForecasts":validation.get("validPregameForecasts",0),
  "matchedFinalOutcomes":validation.get("matchedFinalOutcomes",0),
  "sportsWithCoverageReports":len(coverage.get("sports",{})),
  "endToEndValidated":bool(job_status=="success" and validation.get("matchedFinalOutcomes",0)>0
      and validation.get("validPregameForecasts",0)>0),
  "note":"A green job without real pregame forecasts and matched outcomes is not end-to-end validation."}
 path=ROOT/"workflow-verification.json"
 path.parent.mkdir(parents=True,exist_ok=True)
 path.write_text(json.dumps(status,indent=2)+"\n")
 if status["runId"]:
  history=ROOT/"workflow-runs"
  history.mkdir(parents=True,exist_ok=True)
  (history/(status["runId"]+"-"+str(status["runAttempt"] or "1")+".json")).write_text(json.dumps(status,indent=2)+"\n")
 print(json.dumps(status))
if __name__=="__main__":main()
