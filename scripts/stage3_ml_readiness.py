#!/usr/bin/env python3
"""Stage 3 ML readiness audit. Read-only, deterministic, no model promotion."""
import json
import math
from collections import Counter, defaultdict
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BASE = ROOT / "research-ledger"

def timestamp(value):
    if not isinstance(value, str):
        return None
    try:
        result = datetime.fromisoformat(value.replace("Z", "+00:00"))
        return result.astimezone(timezone.utc) if result.tzinfo else None
    except ValueError:
        return None

def load(path, default):
    target = BASE / path
    return json.loads(target.read_text()) if target.exists() else default

def audit(games, forecasts, outcomes):
    indexed = {g.get("gameKey"): g for g in games if isinstance(g, dict) and g.get("gameKey")}
    results = {o.get("predictionId"): o for o in outcomes if isinstance(o, dict) and o.get("predictionId")}
    reasons = Counter()
    by_sport = defaultdict(lambda: {"valid": 0, "scored": 0, "models": Counter(), "captures": Counter()})
    seen = set()
    for p in forecasts:
        if not isinstance(p, dict):
            reasons["malformed_prediction"] += 1
            continue
        pid = p.get("predictionId")
        if not pid or pid in seen:
            reasons["missing_or_duplicate_prediction_id"] += 1
            continue
        seen.add(pid)
        game = indexed.get(p.get("gameKey"))
        if not game:
            reasons["missing_game"] += 1
            continue
        start = timestamp(game.get("start") or game.get("scheduledStart"))
        predicted = timestamp(p.get("predictedAt"))
        if not start or not predicted or predicted >= start:
            reasons["missing_or_post_kickoff_timestamp"] += 1
            continue
        prob = p.get("baselineProbability")
        if type(prob) not in (float, int) or not math.isfinite(prob) or not 0 < prob < 1:
            reasons["invalid_probability"] += 1
            continue
        sport = game.get("sport") or p["gameKey"].split(":")[0]
        row = by_sport[sport]
        row["valid"] += 1
        row["models"][p.get("modelVersion") or "unknown"] += 1
        row["captures"][p.get("captureMethod") or "unknown"] += 1
        outcome = results.get(pid)
        if not outcome:
            continue
        verified = timestamp(outcome.get("verifiedAt"))
        if (outcome.get("verified") is True and type(outcome.get("result")) is int
                and outcome["result"] in (0, 1) and verified and verified >= start):
            row["scored"] += 1
        else:
            reasons["unverified_or_invalid_outcome"] += 1
    sports = {}
    for name, row in sorted(by_sport.items()):
        sports[name] = {
            "validPregame": row["valid"],
            "scored": row["scored"],
            "modelVersions": dict(row["models"]),
            "captureMethods": dict(row["captures"]),
            "trainingReady": row["scored"] >= 90,
            "productionReady": False
        }
    return {
        "schemaVersion": 1,
        "purpose": "Read-only training readiness; NOT proof of prediction accuracy",
        "sports": sports,
        "rejections": dict(reasons),
        "websiteSimulatorCaptureVerified": False,
        "gate": "Require genuine immutable website forecasts, authenticated pregame features, chronological train/test separation and out-of-sample improvement before release.",
        "productionModelChanged": False
    }

def main():
    index = load("stage3/game-index.json", {}).get("games", [])
    events = load("unified-events.json", {}).get("events", [])
    keys = {g.get("gameKey") for g in index}
    for event in events:
        key = event.get("eventKey")
        if key and key not in keys:
            index.append({"gameKey": key, "sport": event.get("sport"), "start": event.get("scheduledStart")})
            keys.add(key)
    result = audit(index, load("stage3/pregame-predictions.json", []),
                   load("stage3/verified-outcomes.json", []))
    print(json.dumps(result, indent=2))

if __name__ == "__main__":
    main()
