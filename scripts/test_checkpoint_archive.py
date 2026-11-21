import sys,unittest
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parent))
from checkpoint_archive import archive,bridge
class ArchiveTests(unittest.TestCase):
 def test_snapshot_is_deduplicated(self):
  event={"eventKey":"tennis:1","sport":"tennis","observedAt":"2026-11-20T18:00:00Z","status":"pre"}
  a=archive([event],[],"2026-11-20T18:01:00Z")
  self.assertEqual(len(archive([event],a,"2026-11-20T18:02:00Z")),1)
 def test_no_forecast_without_model(self):
  a,b=bridge([],[],{},[],[])
  self.assertEqual(a,[]);self.assertEqual(b,[])
 def test_preserves_actual_early_forecast(self):
  p={"predictionId":"a","gameKey":"nba:1","predictedAt":"2026-11-20T10:00:00Z","baselineProbability":.63,"modelVersion":"v1"}
  index={"games":[{"gameKey":"nba:1","start":"2026-11-20T20:00:00Z"}]}
  a,b=bridge([p],[],index,[],[])
  self.assertEqual(a[0]["checkpoint"],"early")
  self.assertEqual(a[0]["probability"],.63)
  self.assertEqual(len(bridge([p],[],index,a,[])[0]),1)
 def test_rejects_after_start(self):
  p={"predictionId":"a","gameKey":"nba:1","predictedAt":"2026-11-20T20:01:00Z","baselineProbability":.7}
  a,b=bridge([p],[],{"games":[{"gameKey":"nba:1","start":"2026-11-20T20:00:00Z"}]},[],[])
  self.assertFalse(a)
if __name__=="__main__":unittest.main()
