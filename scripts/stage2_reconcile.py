#!/usr/bin/env python3
"""Stage 2: conservative source reconciliation and provenance, offline by default.

Inputs: Stage 1 scoreboard snapshot and optional authorized provider observations.
Never equate two entities solely because their display names match.
"""
import datetime as dt
import json
import os
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "research-ledger" / "stage1" / "latest.json"
OUT = ROOT / "research-ledger" / "stage2" / "latest.json"
EXTERNAL = ROOT / "research-ledger" / "stage2" / "provider-observations.json"
ALLOWED_KINDS = {"injury", "lineup", "player-stat", "game-status"}
ALLOWED_STATUSES = {"confirmed", "reported", "unavailable", "questionable", "probable", "out"}
UTC = dt.timezone.utc

def iso(value):
    if not isinstance(value, str):
        return None
    try:
        d = dt.datetime.fromisoformat(value.replace("Z", "+00:00"))
        return d.astimezone(UTC).isoformat() if d.tzinfo else None
    except ValueError:
        return None

def text(value):
    return value.strip() if isinstance(value, str) else ""

def reconcile(stage1, observations=None):
    observations = observations or []
    events = stage1.get("events") or []
    collected = iso(stage1.get("collectedAt"))
    index = {}
    teams = {}
    for game in events:
        key = text(game.get("eventKey"))
        sport = text(game.get("sport"))
        eid = text(game.get("sourceEventId"))
        if not key or not sport or not eid or key != f"{sport}:{eid}" or key in index:
            continue
        if not text(game.get("sourceUrl")) or not iso(game.get("observedAt")):
            continue
        index[key] = {"gameKey": key, "sport": sport, "start": game.get("scheduledStart"),
                      "status": game.get("status"), "completed": game.get("completed") is True,
                      "teams": [], "observations": [], "conflicts": [], "unresolved": [],
                      "source": {"provider": "espn", "eventId": eid, "url": game["sourceUrl"],
                                 "observedAt": iso(game["observedAt"])}}
        for t in game.get("teams") or []:
            tid = text(t.get("sourceTeamId"))
            if not tid:
                continue
            tk = f"{sport}:espn:{tid}"
            teams[tk] = {"teamKey": tk, "sport": sport, "provider": "espn",
                         "providerTeamId": tid, "displayName": t.get("name")}
            index[key]["teams"].append({"teamKey": tk, "homeAway": t.get("homeAway"),
                                          "score": t.get("score")})
    rejected = []
    accepted = 0
    seen = {}
    for n, o in enumerate(observations):
        if not isinstance(o, dict):
            rejected.append({"index": n, "reason": "not an object"}); continue
        provider = text(o.get("provider"))
        game_key = text(o.get("gameKey"))
        kind = text(o.get("kind"))
        source_id = text(o.get("sourceEventId"))
        source_url = text(o.get("sourceUrl"))
        as_of = iso(o.get("observedAt"))
        source_time = iso(o.get("effectiveAt"))
        entity = text(o.get("entityId"))
        if (not provider or not source_id or not source_url.startswith("https://")
                or kind not in ALLOWED_KINDS or not as_of or not source_time
                or not entity or game_key not in index):
            rejected.append({"index": n, "reason": "missing or invalid source, identity, kind, or timestamp"}); continue
        # A provider-specific ID alone does not authorize linking to an ESPN event.
        # The provider must supply an explicitly verified crosswalk for non-ESPN data.
        if provider == "espn":
            if source_id != index[game_key]["source"]["eventId"]:
                rejected.append({"index": n, "reason": "ESPN event ID mismatch"}); continue
        else:
            crosswalk = o.get("crosswalk")
            if (not isinstance(crosswalk, dict)
                    or crosswalk.get("verified") is not True
                    or text(crosswalk.get("espnEventId")) != index[game_key]["source"]["eventId"]
                    or text(crosswalk.get("providerEventId")) != source_id
                    or not text(crosswalk.get("method"))
                    or not text(crosswalk.get("evidenceUrl")).startswith("https://")):
                rejected.append({"index": n, "reason": "non-ESPN game crosswalk unverified"}); continue
        if o.get("verified") is not True:
            rejected.append({"index": n, "reason": "observation not independently verified"}); continue
        if kind == "injury" and text(o.get("status")) not in ALLOWED_STATUSES:
            rejected.append({"index": n, "reason": "injury status unsupported"}); continue
        if kind == "player-stat" and (not text(o.get("statName")) or not isinstance(o.get("value"), (int, float)) or isinstance(o.get("value"), bool)):
            rejected.append({"index": n, "reason": "player stat missing numeric value/name"}); continue
        # Preserve evidence and contradictory observations. Do not resolve conflicts by freshness alone.
        normalized = {"provider": provider, "providerEventId": source_id,
                      "kind": kind, "entityId": entity, "entityProvider": text(o.get("entityProvider")) or provider,
                      "status": o.get("status"), "statName": o.get("statName"), "value": o.get("value"),
                      "sourceUrl": source_url, "observedAt": as_of, "effectiveAt": source_time,
                      "verified": True, "modelEligible": False}
        # Stage 2 only links evidence; supplied verification flags are not proof.
        # No model activation without authenticated sources and pregame gating.
        normalized["modelEligible"] = False
        # Historical stats are not model features until time-gated.
        dedup = (game_key, provider, source_id, kind, entity, text(o.get("statName")), source_time, source_url)
        if dedup in seen:
            continue
        seen[dedup] = normalized
        index[game_key]["observations"].append(normalized)
        accepted += 1
    conflicts = 0
    for game in index.values():
        groups = {}
        for o in game["observations"]:
            k = (o["kind"], o["entityProvider"], o["entityId"], o.get("statName"))
            groups.setdefault(k, []).append(o)
        for k, rows in groups.items():
            # Only compare the latest observation per provider for an entity.
            latest = {}
            for row in rows:
                provider = row["provider"]
                if provider not in latest or row["observedAt"] > latest[provider]["observedAt"]:
                    latest[provider] = row
            values = {json.dumps({"status": x.get("status"), "value": x.get("value")}, sort_keys=True) for x in latest.values()}
            if len(values) > 1:
                game["conflicts"].append({"kind": k[0], "entityProvider": k[1], "entityId": k[2],
                                           "statName": k[3], "providers": sorted(latest),
                                           "resolution": "unresolved; excluded from automatic model changes"})
                for row in rows:
                    row["modelEligible"] = False
                conflicts += 1
    return {"schemaVersion": 2, "generatedAt": dt.datetime.now(UTC).isoformat(),
            "stage1CollectedAt": collected, "games": sorted(index.values(), key=lambda x: x["gameKey"]),
            "teams": sorted(teams.values(), key=lambda x: x["teamKey"]),
            "summary": {"games": len(index), "teams": len(teams), "verifiedObservations": accepted,
                        "conflicts": conflicts, "rejectedObservations": len(rejected)},
            "rejected": rejected,
            "limitations": "No automatic identity match by name; provider observations require explicit verified event crosswalk. No automatic simulation changes."}

def main():
    if not DATA.exists():
        raise SystemExit("Stage 1 snapshot missing; Stage 2 will not fabricate data")
    stage1 = json.loads(DATA.read_text())
    observations = []
    if EXTERNAL.exists():
        observations = json.loads(EXTERNAL.read_text())
        if not isinstance(observations, list):
            raise SystemExit("Provider observations must be a JSON array")
    result = reconcile(stage1, observations)
    OUT.parent.mkdir(parents=True, exist_ok=True)
    temp = OUT.with_suffix(".json.tmp")
    temp.write_text(json.dumps(result, indent=2, ensure_ascii=False) + "\n")
    os.replace(temp, OUT)
    print(json.dumps(result["summary"]))

if __name__ == "__main__":
    main()
