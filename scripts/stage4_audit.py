#!/usr/bin/env python3
"""Stage 4: conservative offline paired-model audit and rolling evaluation.
This report is diagnostic only and cannot deploy model changes.
"""
import datetime as dt
import json
import math
import os
from collections import defaultdict
from pathlib import Path
from stage3_evaluate import instant, probability, score

ROOT=Path(__file__).resolve().parents[1]
S2=ROOT/"research-ledger"/"stage2"/"latest.json"
P=ROOT/"research-ledger"/"stage3"/"pregame-predictions.json"
O=ROOT/"research-ledger"/"stage3"/"verified-outcomes.json"
OUT=ROOT/"research-ledger"/"stage4"/"report.json"

def load(path,default):
    return json.loads(path.read_text()) if path.exists() else default

def evaluate(stage2,predictions,outcomes):
    games={g["gameKey"]:g for g in stage2.get("games",[]) if g.get("gameKey")}
    actual={}
    bad=[]
    for i,o in enumerate(outcomes):
        if not isinstance(o,dict) or not isinstance(o.get("predictionId"),str) or o["predictionId"] in actual or type(o.get("result")) is not int or o["result"] not in (0,1) or o.get("verified") is not True or not str(o.get("sourceUrl","")).startswith("https://") or not instant(o.get("verifiedAt")):
            bad.append({"kind":"outcome","index":i,"reason":"invalid/duplicate outcome or missing provenance"});continue
        actual[o["predictionId"]]=o
    rows=[]
    seen=set()
    pending=0
    for i,p in enumerate(predictions):
        if not isinstance(p,dict):
            bad.append({"kind":"prediction","index":i,"reason":"not an object"});continue
        pid=p.get("predictionId")
        game=games.get(p.get("gameKey"))
        when=instant(p.get("predictedAt"))
        start=instant(game.get("start")) if game else None
        if (not isinstance(pid,str) or not pid or pid in seen or not game or not when or not start or when>=start
                or not p.get("market") or not p.get("entityId") or not p.get("modelVersion")
                or not str(p.get("sourceUrl","")).startswith("https://")
                or not probability(p.get("baselineProbability"))):
            bad.append({"kind":"prediction","index":i,"reason":"invalid or duplicate pregame prediction"});continue
        seen.add(pid)
        outcome=actual.get(pid)
        if not outcome:
            pending+=1;continue
        verified_at=instant(outcome["verifiedAt"])
        if verified_at<start:
            bad.append({"kind":"outcome","index":pid,"reason":"verified before kickoff"});continue
        # Candidate probability is only eligible for paired audit with an evidence
        # capture timestamp preceding prediction and explicit source provenance.
        cp=p.get("candidateProbability")
        capture=instant(p.get("candidateEvidenceCapturedAt"))
        candidate_ok=(probability(cp) and capture is not None and capture<=when
            and p.get("candidateEvidenceAuthenticated") is True
            and p.get("candidateEvidenceGateVersion")=="stage3-authenticated-v1"
            and str(p.get("candidateEvidenceSourceUrl","")).startswith("https://"))
        rows.append({"id":pid,"sport":game.get("sport") or p["gameKey"].split(":")[0],
                     "market":p["market"],"start":start.isoformat(),"baseline":float(p["baselineProbability"]),
                     "candidate":float(cp) if candidate_ok else None,"result":outcome["result"]})
    by_sport=defaultdict(list)
    for row in rows:by_sport[row["sport"]].append(row)
    def summary(group):
        base=score([(r["baseline"],r["result"]) for r in group])
        paired=[r for r in group if r["candidate"] is not None]
        b=score([(r["baseline"],r["result"]) for r in paired])
        c=score([(r["candidate"],r["result"]) for r in paired])
        return {"scored":len(group),"paired":len(paired),"baseline":base,
                "pairedBaseline":b,"pairedCandidate":c,
                "pairedBrierDelta":round(c["brier"]-b["brier"],6) if c and b else None,
                "pairedLogLossDelta":round(c["logLoss"]-b["logLoss"],6) if c and b else None}
    # Chronological groups expose whether improvements persist over time.
    months=defaultdict(list)
    for r in rows:months[r["start"][:7]].append(r)
    return {"schemaVersion":4,"generatedAt":dt.datetime.now(dt.timezone.utc).isoformat(),
            "total":summary(rows),
            "bySport":{k:summary(v) for k,v in sorted(by_sport.items())},
            "byKickoffMonth":{k:summary(v) for k,v in sorted(months.items())},
            "pendingOutcomes":pending,"rejected":bad,
            "diagnostics":{"candidateCoverage":sum(r["candidate"] is not None for r in rows),
                           "minimumPairedSampleForReview":200,
                           "sufficientPairedSample":sum(r["candidate"] is not None for r in rows)>=200,
                           "sourceAuthenticationIndependentlyAudited":False,
                           "historicalPregameSnapshotsImmutable":False,
                           "outOfSampleValidationComplete":False},
            "improvementEstablished":False,"liveModelActivated":False,
            "deploymentGate":{"passed":False,"reason":"No independently audited immutable pregame predictions and outcomes, trusted source verification, or out-of-sample evidence"},
            "interpretation":"Negative paired deltas favor candidate on the same games; no causal improvement claim is justified from these snapshots."}

def main():
    if not S2.exists():raise SystemExit("Stage 2 evidence missing; Stage 4 cannot evaluate")
    result=evaluate(load(S2,{}),load(P,[]),load(O,[]))
    OUT.parent.mkdir(parents=True,exist_ok=True)
    tmp=OUT.with_suffix(".json.tmp")
    tmp.write_text(json.dumps(result,indent=2)+"\n")
    os.replace(tmp,OUT)
    print(json.dumps({"scored":result["total"]["scored"],"paired":result["total"]["paired"],"gate":False}))

if __name__=="__main__":main()
