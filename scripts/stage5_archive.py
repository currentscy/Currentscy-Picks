#!/usr/bin/env python3
"""Stage 5: append-only pregame snapshot capture and verified final-score evidence.

No forecasts are generated. This captures the evidence needed to evaluate
real model exports in later runs, without touching live website predictions.
"""
import datetime as dt
import hashlib
import json
import os
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
STAGE1=ROOT/"research-ledger"/"stage1"/"latest.json"
ARCHIVE=ROOT/"research-ledger"/"stage5"/"snapshots"
INDEX=ROOT/"research-ledger"/"stage5"/"manifest.json"
UTC=dt.timezone.utc

def instant(value):
    try:
        v=dt.datetime.fromisoformat(value.replace("Z","+00:00"))
        return v.astimezone(UTC) if v.tzinfo else None
    except (AttributeError,ValueError):return None

def snapshot(stage1,existing=None,now=None):
    now=now or dt.datetime.now(UTC)
    existing=existing or {"schemaVersion":5,"entries":[]}
    entries=list(existing.get("entries") or [])
    known={x.get("digest") for x in entries}
    records=[]
    for e in stage1.get("events") or []:
        start=instant(e.get("scheduledStart"))
        observed=instant(e.get("observedAt"))
        if not start or not observed or observed>now or not e.get("eventKey") or not e.get("sourceUrl","").startswith("https://"):
            continue
        # A source timestamp after kickoff cannot establish pregame knowledge.
        phase="pregame" if observed<start else "postgame"
        if phase=="postgame" and e.get("completed") is not True:
            continue
        teams=e.get("teams") or []
        if len(teams)!=2 or not all(t.get("sourceTeamId") for t in teams):
            continue
        if phase=="postgame" and not all(t.get("score") is not None for t in teams):
            continue
        payload={"schemaVersion":5,"gameKey":e["eventKey"],"sport":e.get("sport"),
                 "phase":phase,"scheduledStart":e["scheduledStart"],
                 "sourceObservedAt":e["observedAt"],"sourceUrl":e["sourceUrl"],
                 "teams":[{"sourceTeamId":t.get("sourceTeamId"),"homeAway":t.get("homeAway"),
                           "score":t.get("score") if phase=="postgame" else None} for t in teams],
                 "completed":phase=="postgame"}
        canonical=json.dumps(payload,sort_keys=True,separators=(",",":"))
        digest=hashlib.sha256(canonical.encode()).hexdigest()
        if digest in known:continue
        records.append((digest,payload))
        entries.append({"digest":digest,"gameKey":e["eventKey"],"phase":phase,
                        "sourceObservedAt":e["observedAt"],"path":f"snapshots/{digest}.json"})
        known.add(digest)
    return {"schemaVersion":5,"entries":entries},records

def main():
    if not STAGE1.exists():raise SystemExit("No Stage 1 source snapshot")
    source=json.loads(STAGE1.read_text())
    old=json.loads(INDEX.read_text()) if INDEX.exists() else None
    manifest,records=snapshot(source,old)
    ARCHIVE.mkdir(parents=True,exist_ok=True)
    for digest,payload in records:
        dest=ARCHIVE/(digest+".json")
        # Exclusive create: existing evidence cannot be silently overwritten.
        try:
            with dest.open("x") as f:json.dump(payload,f,indent=2);f.write("\n")
        except FileExistsError:
            if json.loads(dest.read_text())!=payload:raise RuntimeError("Snapshot hash collision or corruption")
    INDEX.parent.mkdir(parents=True,exist_ok=True)
    temp=INDEX.with_suffix(".json.tmp")
    temp.write_text(json.dumps(manifest,indent=2)+"\n")
    os.replace(temp,INDEX)
    print(json.dumps({"newSnapshots":len(records),"totalSnapshots":len(manifest["entries"]),
                      "modelPredictionsCaptured":0,"liveModelChanged":False}))

if __name__=="__main__":main()
