import unittest
import importlib.util
from pathlib import Path
spec=importlib.util.spec_from_file_location('unified_event_ledger',Path(__file__).with_name('unified-event-ledger.py'))
module=importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
merge=module.merge
class EventLedgerTests(unittest.TestCase):
 def test_persists_old_games(self):
  old=[{"eventKey":"nba:old","observedAt":"2026-11-19T00:00:00Z","firstObservedAt":"2026-11-19T00:00:00Z","lastObservedAt":"2026-11-19T00:00:00Z","observationCount":1}]
  new=[{"eventKey":"nba:new","observedAt":"2026-11-20T00:00:00Z"}]
  self.assertEqual(len(merge(old,new)),2)
 def test_does_not_regress_completed_result(self):
  old=[{"eventKey":"nba:1","completed":True,"teams":[{"score":"101"}],"observedAt":"2026-11-20T00:00:00Z","lastObservedAt":"2026-11-20T00:00:00Z","observationCount":1}]
  new=[{"eventKey":"nba:1","completed":False,"teams":[{"score":None}],"observedAt":"2026-11-21T00:00:00Z"}]
  result=merge(old,new)
  self.assertTrue(result[0]["completed"])
  self.assertEqual(result[0]["teams"][0]["score"],"101")
 def test_ufc_card_splits_fights(self):
  sample={"events":[{"id":"card1","date":"2026-11-21T20:00:00Z",
    "competitions":[{"id":"fight1","competitors":[{"athlete":{"id":"a"}},{"athlete":{"id":"b"}}]},
                    {"id":"fight2","competitors":[{"athlete":{"id":"c"}},{"athlete":{"id":"d"}}]}]}]}
  from datetime import datetime,timezone
  events,checks=module.collect(now=datetime(2026,11,20,tzinfo=timezone.utc),
     fetcher=lambda url:sample if "/mma/ufc/" in url else {"events":[]},back=0,forward=0)
  ids={e["eventKey"] for e in events}
  self.assertIn("ufc:fight1",ids)
  self.assertIn("ufc:fight2",ids)
  self.assertEqual(len([e for e in events if e["sport"]=="ufc"]),2)
if __name__=="__main__":unittest.main()
