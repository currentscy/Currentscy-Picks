#!/usr/bin/env python3
"""V88 Step 3: free pbpstats possession and lineup research.
Never infer a primary defender from a shared lineup.
Run manually from GitHub Actions; unavailable data fails closed.
"""
import json
import os
from datetime import datetime, timezone
from pathlib import Path

OUT = Path("data/v88-pbpstats.json")
SEASON = os.getenv("NBA_SEASON", "2026-27")
GAME_IDS = [x.strip() for x in os.getenv("NBA_GAME_IDS", "").split(",") if x.strip()][:3]

def main():
    report = {
        "schemaVersion": "88.3",
        "provider": "pbpstats",
        "season": SEASON,
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "status": "unavailable",
        "source": "https://github.com/dblackrun/pbpstats",
        "games": [],
        "errors": [],
        "limits": "Lineup/possession data does not prove individual defender assignments; no model probability adjustment."
    }
    if not GAME_IDS:
        report["errors"].append("No NBA_GAME_IDS supplied. Provide completed NBA game IDs to workflow input.")
    else:
        try:
            from pbpstats.client import Client
            settings = {
                "dir": "/tmp/v88-pbpstats",
                "Possessions": {"source": "web", "data_provider": "stats_nba"},
                "EnhancedPbp": {"source": "web", "data_provider": "stats_nba"},
            }
            client = Client(settings)
            for gid in GAME_IDS:
                if not gid.isdigit() or len(gid) > 12:
                    report["errors"].append(f"Invalid game ID: {gid[:20]}")
                    continue
                try:
                    game = client.Game(gid)
                    possessions = game.possessions.items
                    counts = {}
                    valid = 0
                    for possession in possessions:
                        offense = getattr(possession, "offense_team_id", None)
                        lineup = getattr(possession, "lineup_ids", None)
                        if not offense or not isinstance(lineup, (list, tuple)) or len(lineup) != 2:
                            continue
                        valid += 1
                        key = "|".join(str(x) for x in lineup)
                        counts[key] = counts.get(key, 0) + 1
                    if valid:
                        report["games"].append({
                            "gameId": gid,
                            "validatedPossessions": valid,
                            "lineupPossessionCounts": counts,
                            "assignmentVerified": False,
                        })
                    else:
                        report["errors"].append(f"{gid}: no possessions with validated two-team lineup IDs")
                except Exception as exc:
                    report["errors"].append(f"{gid}: {type(exc).__name__}: {str(exc)[:180]}")
            if report["games"]:
                report["status"] = "verified-sample"
        except Exception as exc:
            report["errors"].append(f"{type(exc).__name__}: {str(exc)[:200]}")
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(report, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print("V88 pbpstats:", report["status"], "games:", len(report["games"]))
    for err in report["errors"]:
        print("WARNING:", err)

if __name__ == "__main__":
    main()
