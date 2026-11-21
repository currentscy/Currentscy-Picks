import datetime as dt
import unittest
from importlib.machinery import SourceFileLoader
from pathlib import Path
m=SourceFileLoader("settler",str(Path(__file__).with_name("settle-archived-forecasts.py"))).load_module()
class SettlementTests(unittest.TestCase):
 def setUp(self):
  self.now=dt.datetime(2026,11,21,5,tzinfo=dt.timezone.utc)
  self.event={"eventKey":"nba:123","scheduledStart":"2026-11-21T01:00:00Z","completed":True,
   "observedAt":"2026-11-21T04:00:00Z","sourceUrl":"https://site.api.espn.com/scoreboard",
   "teams":[{"homeAway":"home","sourceTeamId":"a","score":"105"},
            {"homeAway":"away","sourceTeamId":"b","score":"100"}]}
  self.pred={"predictionId":"forecast-123","gameKey":"nba:123","market":"home-win",
   "predictedAt":"2026-11-20T23:00:00Z","homeTeamId":"a","awayTeamId":"b"}
 def test_settles_real_pregame(self):
  rows=m.extract([self.event],[self.pred],[],self.now)
  self.assertEqual(len(rows),1);self.assertEqual(rows[0]["result"],1)
 def test_no_backdated_forecast(self):
  self.pred["predictedAt"]="2026-11-21T02:00:00Z"
  self.assertEqual(m.extract([self.event],[self.pred],[],self.now),[])
 def test_no_duplicate(self):
  self.assertEqual(m.extract([self.event],[self.pred],[{"predictionId":"forecast-123"}],self.now),[])
 def test_no_draw(self):
  self.event["teams"][1]["score"]="105"
  self.assertEqual(m.extract([self.event],[self.pred],[],self.now),[])
 def test_no_unconfirmed_final(self):
  self.event["completed"]=False
  self.assertEqual(m.extract([self.event],[self.pred],[],self.now),[])
 def test_team_id_mismatch(self):
  self.pred["homeTeamId"]="wrong"
  self.assertEqual(m.extract([self.event],[self.pred],[],self.now),[])
if __name__=="__main__":unittest.main()
