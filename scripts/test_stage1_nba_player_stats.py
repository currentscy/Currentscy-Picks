import datetime as dt
import unittest

from stage1_nba_player_stats import collect, parse_boxscore
from stage2_reconcile import reconcile

UTC = dt.timezone.utc

class NbaPlayerEvidenceTests(unittest.TestCase):
    def setUp(self):
        self.now = dt.datetime(2026, 11, 23, 2, 0, tzinfo=UTC)
        self.stage1 = {"collectedAt": self.now.isoformat(), "events": [{
            "eventKey": "nba:future", "sourceEventId": "future", "sport": "nba",
            "scheduledStart": "2026-11-25T02:00:00Z", "completed": False,
            "sourceUrl": "https://site.api.espn.com/scoreboard",
            "observedAt": self.now.isoformat(),
            "teams": [{"sourceTeamId": "1", "name": "Home", "homeAway": "home"},
                      {"sourceTeamId": "2", "name": "Away", "homeAway": "away"}]}]}

    def fetch(self, url):
        if "/summary?" in url:
            return {"boxscore": {"players": [
                {"team": {"id": "1"}, "statistics": [{"labels": ["PTS", "REB", "AST"],
                    "athletes": [{"athlete": {"id": "101", "displayName": "A"},
                                  "stats": ["21", "8", "5"]}]}]},
                {"team": {"id": "2"}, "statistics": [{"labels": ["PTS", "REB", "AST"],
                    "athletes": [{"athlete": {"id": "202", "displayName": "B"},
                                  "stats": ["18", "7", "6"]}]}]}]}}
        if "20261122" in url:
            return {"events": [{"id": "past", "date": "2026-11-22T02:00:00Z",
                    "status": {"type": {"completed": True}}}]}
        return {"events": []}

    def test_two_teams_link_to_upcoming_game(self):
        observations, report = collect(self.stage1, fetcher=self.fetch, now=self.now, lookback=1)
        self.assertEqual(len(observations), 6)
        self.assertEqual({o["teamId"] for o in observations}, {"1", "2"})
        self.assertEqual({o["sourceSeason"] for o in observations}, {2027})
        self.assertEqual([x["status"] for x in report["teamCoverage"]], ["available", "available"])
        linked = reconcile(self.stage1, observations)
        self.assertEqual(linked["summary"]["verifiedObservations"], 6)
        self.assertEqual(linked["summary"]["rejectedObservations"], 0)
        self.assertTrue(all(not o["modelEligible"] for o in linked["games"][0]["observations"]))

    def test_reject_wrong_team_and_future_source(self):
        observations, _ = collect(self.stage1, fetcher=self.fetch, now=self.now, lookback=1)
        bad = dict(observations[0], teamId="999")
        future = dict(observations[1], sourceGameStart="2026-11-26T00:00:00Z",
                      effectiveAt="2026-11-26T00:00:00Z")
        linked = reconcile(self.stage1, [bad, future])
        self.assertEqual(linked["summary"]["verifiedObservations"], 0)
        self.assertEqual(linked["summary"]["rejectedObservations"], 2)

    def test_missing_opponent_explicit(self):
        def only_home(url):
            payload = self.fetch(url)
            if "/summary?" in url:
                payload["boxscore"]["players"] = payload["boxscore"]["players"][:1]
            return payload
        observations, report = collect(self.stage1, fetcher=only_home, now=self.now, lookback=1)
        self.assertEqual({o["teamId"] for o in observations}, {"1"})
        self.assertEqual(report["teamCoverage"][1]["status"], "unavailable")

if __name__ == "__main__":
    unittest.main()
