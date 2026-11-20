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
if __name__=="__main__":unittest.main()
