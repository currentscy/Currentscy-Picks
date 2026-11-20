#!/usr/bin/env python3
"""Stage 3: pregame-only evidence gating and honest, offline model evaluation.
No invented predictions. Never edits the website's live simulation.
"""
import datetime as dt
import json
import math
import os
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
STAGE2 = ROOT / "research-ledger" / "stage2" / "latest.json"
PREDICTIONS = ROOT / "research-ledger" / "stage3" / "pregame-predictions.json"
OUTCOMES = ROOT / "research-ledger" / "stage3" / "verified-outcomes.json"
OUTPUT = ROOT / "research-ledger" / "stage3" / "evaluation.json"
UTC = dt.timezone.utc

def instant(s):
    if not isinstance(s, str): return None
    try:
        d = dt.datetime.fromisoformat(s.replace("Z", "+00:00"))
        return d.astimezone(UTC) if d.tzinfo else None
    except ValueError: return None

def probability(p):
    return type(p) in (float, int) and math.isfinite(p) and 0 < p < 1

def score(rows):
    if not rows: return None
    brier = sum((p-y)**2 for p,y in rows)/len(rows)
    logloss = -sum(y*math.log(p)+(1-y)*math.log1p(-p) for p,y in rows)/len(rows)
    bins = []
    for low in (0, .2, .4, .6, .8):
        subset = [(p,y) for p,y in rows if low <= p < low+.2 or (low == .8 and p == 1)]
        if subset:
            bins.append({"range": [low, round(low+.2, 2)], "n": len(subset),
                         "meanPrediction": round(sum(p for p,y in subset)/len(subset),4),
                         "observedRate": round(sum(y for p,y in subset)/len(subset),4)})
    return {"n":len(rows), "brier":round(brier,6), "logLoss":round(logloss,6), "calibrationBins":bins}

def evaluate(stage2, predictions=None, outcomes=None):
    predictions = predictions or []
    outcomes = outcomes or []
    games = {g.get("gameKey"):g for g in stage2.get("games",[]) if g.get("gameKey")}
    actual = {}
    rejected = []
    for n,o in enumerate(outcomes):
        if not isinstance(o,dict) or o.get("verified") is not True or not o.get("sourceUrl","").startswith("https://") or o.get("result") not in (0,1,True,False) or not instant(o.get("verifiedAt")) or not o.get("predictionId"):
            rejected.append({"type":"outcome","index":n,"reason":"missing verified result or provenance"});continue
        if o["predictionId"] in actual:
            rejected.append({"type":"outcome","index":n,"reason":"duplicate outcome ID"});continue
        actual[o["predictionId"]]=o
    baseline=[];candidate=[];matched=[];accepted=[];unscored=[]
    for n,p in enumerate(predictions):
        if not isinstance(p,dict):
            rejected.append({"type":"prediction","index":n,"reason":"invalid object"});continue
        game=games.get(p.get("gameKey"))
        timestamp=instant(p.get("predictedAt"))
        start=instant(game.get("start")) if game else None
        if (not game or not timestamp or not start or timestamp>=start
                or not p.get("predictionId") or not p.get("market")
                or not p.get("entityId") or not p.get("modelVersion")
                or not p.get("sourceUrl","").startswith("https://")
                or not probability(p.get("baselineProbability"))):
            rejected.append({"type":"prediction","index":n,"reason":"missing game/identity, pregame timestamp, source or valid probability"});continue
        # Candidate evidence must be independently authenticated and captured
        # strictly before prediction time; Stage 2 cannot certify that today.
        cp=p.get("candidateProbability")
        candidate_valid=probability(cp) and p.get("candidateEvidenceAuthenticated") is True and p.get("candidateEvidenceCapturedAt") and instant(p.get("candidateEvidenceCapturedAt")) and instant(p["candidateEvidenceCapturedAt"])<=timestamp and p.get("candidateEvidenceGateVersion")=="stage3-authenticated-v1"
        accepted.append(p["predictionId"])
        o=actual.get(p["predictionId"])
        if not o:
            unscored.append(p["predictionId"]);continue
        # Require outcome verification at or after kickoff.
        if instant(o["verifiedAt"]) < start:
            rejected.append({"type":"outcome","index":p["predictionId"],"reason":"outcome verified before game start"});continue
        y=int(o["result"])
        baseline.append((float(p["baselineProbability"]),y))
        if candidate_valid:
            candidate.append((float(cp),y))
            matched.append((float(p["baselineProbability"]),float(cp),y))
    matched_baseline=score([(b,y) for b,c,y in matched])
    matched_candidate=score([(c,y) for b,c,y in matched])
    return {"schemaVersion":3,"generatedAt":dt.datetime.now(UTC).isoformat(),
            "summary":{"gamesAvailable":len(games),"validPregamePredictions":len(accepted),
                       "scoredBaselinePredictions":len(baseline),"scoredCandidatePredictions":len(candidate),
                       "pairedSample":len(matched),"unscoredPredictions":len(unscored),
                       "rejectedRecords":len(rejected)},
            "baseline":score(baseline),"candidate":score(candidate),
            "pairedBaseline":matched_baseline,"pairedCandidate":matched_candidate,
            "improvementEstablished":False,"liveModelActivated":False,
            "deploymentGate":{"passed":False,"reason":"Requires independently authenticated pregame evidence, immutable prediction capture, sufficient out-of-sample paired sample, and reviewed calibration before activation"},
            "rejected":rejected,
            "note":"Evaluation scaffold only. Self-asserted evidence flags do not authenticate sources; candidate numbers cannot automatically deploy."}

def read(path,default):
    if not path.exists():return default
    return json.loads(path.read_text())

def main():
    if not STAGE2.exists():
        raise SystemExit("Stage 2 snapshot missing; refusing to manufacture predictions")
    evidence=read(STAGE2,{})
    historic=read(ROOT/"research-ledger"/"stage3"/"game-index.json",{"games":[]})
    known={g.get("gameKey") for g in evidence.get("games",[])}
    evidence["games"]=list(evidence.get("games",[]))+[g for g in historic.get("games",[]) if g.get("gameKey") not in known]
    data=evaluate(evidence,read(PREDICTIONS,[]),read(OUTCOMES,[]))
    OUTPUT.parent.mkdir(parents=True,exist_ok=True)
    tmp=OUTPUT.with_suffix(".json.tmp")
    tmp.write_text(json.dumps(data,indent=2)+"\n")
    os.replace(tmp,OUTPUT)
    print(json.dumps(data["summary"]))

if __name__=="__main__":main()
