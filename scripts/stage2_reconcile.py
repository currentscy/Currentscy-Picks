#!/usr/bin/env python3
"""Stage 2: conservative source reconciliation and provenance, offline by default.

Inputs: Stage 1 scoreboard snapshot and optional authorized provider observations.
Never equate two entities solely because their display names match.
"""
import datetime as dt
import json
import math
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
        if kind == "player-stat" and (not text(o.get("statName")) or type(o.get("value")) not in (int, float) or not math.isfinite(o["value"])):
            rejected.append({"index": n, "reason": "player stat missing numeric value/name"}); continue
        # Historical NBA box scores are valid only for a known team in this
        # matchup, from a different, already-started game in the same season.
        historical_id = text(o.get("historicalEventId"))
        if historical_id:
            team_id = text(o.get("teamId"))
            game_start = iso(index[game_key].get("start"))
            historical_start = iso(o.get("sourceGameStart"))
            expected_season = (game_start[:4] if game_start else "")
            if (kind != "player-stat" or provider != "espn"
                    or not team_id or not any(t["teamKey"] == f"{index[game_key]['sport']}:espn:{team_id}" for t in index[game_key]["teams"])
                    or historical_id == source_id or not historical_start
                    or not game_start or historical_start >= game_start
                    or historical_start > as_of
                    or not isinstance(o.get("sourceSeason"), int)
                    or o["sourceSeason"] != (int(historical_start[:4]) + (1 if int(historical_start[5:7]) >= 10 else 0))
                    or o["sourceSeason"] != (int(game_start[:4]) + (1 if int(game_start[5:7]) >= 10 else 0))):
                rejected.append({"index": n, "reason": "historical NBA player evidence team, event, season, or time mismatch"}); continue
        # Future-dated or out-of-order evidence must not enter the linked record.
        if source_time > as_of:
            rejected.append({"index": n, "reason": "effective time after observation"}); continue
        # Preserve evidence and contradictory observations. Do not resolve conflicts by freshness alone.
        normalized = {"provider": provider, "providerEventId": source_id,
                      "kind": kind, "entityId": entity, "entityProvider": text(o.get("entityProvider")) or provider,
                      "status": o.get("status"), "statName": o.get("statName"), "value": o.get("value"),
                      "sourceUrl": source_url, "observedAt": as_of, "effectiveAt": source_time,
                      "verified": True, "modelEligible": False,
                      "teamId": o.get("teamId"), "historicalEventId": historical_id or None,
                      "sourceSeason": o.get("sourceSeason"), "sourceGameStart": o.get("sourceGameStart") }
        # Stage 2 only links evidence; supplied verification flags are not proof.
        # No model activation without authenticated sources and pregame gating.
        normalized["modelEligible"] = False
        # Historical stats are not model features until time-gated.
        dedup = (game_key, provider, source_id, kind, entity, text(o.get("statName")), source_time, source_url, historical_id)
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
