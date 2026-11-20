import datetime as dt
import unittest
from stage1_collect import collect, normalize_event, SPORTS

class StageOneTests(unittest.TestCase):
    def test_normalization_preserves_provenance_and_missingness(self):
        event = {"id": "123", "date": "2026-11-20T20:00Z", "status": {"type": {"name": "STATUS_SCHEDULED", "completed": False}}, "competitions": [{"competitors": [{"team": {"id": "1", "displayName": "Away"}, "homeAway": "away"}, {"team": {"id": "2", "displayName": "Home"}, "homeAway": "home"}]}]}
        row = normalize_event(event, "nba", "2026-11-20T10:00:00+00:00", "https://example.test")
        self.assertEqual(row["eventKey"], "nba:123")
        self.assertIsNone(row["verifiedInjuries"])
        self.assertFalse(row["quality"]["injuriesVerified"])
        self.assertEqual(row["teams"][0]["name"], "Away")

    def test_collect_deduplicates_events_and_reports_failures(self):
        def fake(url):
            if "eng.1" in url:
                raise ValueError("unavailable")
            return {"events": [{"id": "42", "date": "2026-11-20T20:00Z", "competitions": [], "status": {"type": {"completed": False}}}]}
        result = collect(dt.datetime(2026, 11, 20, tzinfo=dt.timezone.utc), fake, 0, 1)
        self.assertEqual(result["summary"]["eventCount"], len(SPORTS) - 1)
        self.assertEqual(result["summary"]["failedRequests"], 2)
        self.assertEqual(result["summary"]["injuryRecordsVerified"], 0)

if __name__ == "__main__":
    unittest.main()
