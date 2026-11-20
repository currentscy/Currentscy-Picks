import unittest
from validation_dashboard import audit
class DashboardTests(unittest.TestCase):
 def test_empty_is_not_validated(self):
  a=audit([],[],[],{})
  self.assertFalse(a["fiveSteps"]["pregameForecastCaptured"])
 def test_pregame_prediction_and_final(self):
  e=[{"eventKey":"nba:1","sport":"nba","scheduledStart":"2026-11-20T22:00:00Z","completed":True}]
  p=[{"gameKey":"nba:1","predictionId":"p1","predictedAt":"2026-11-20T20:00:00Z","baselineProbability":.6}]
  o=[{"predictionId":"p1","verifiedAt":"2026-11-21T01:00:00Z","result":1,"verified":True,"sourceUrl":"https://site.api.espn.com/test"}]
  a=audit(e,p,o,{"sports":{"nba":{}}})
  self.assertEqual(a["matchedFinalOutcomes"],1)
 def test_post_kickoff_is_rejected(self):
  e=[{"eventKey":"nba:1","sport":"nba","scheduledStart":"2026-11-20T22:00:00Z","completed":True}]
  p=[{"gameKey":"nba:1","predictionId":"p1","predictedAt":"2026-11-20T23:00:00Z","baselineProbability":.6}]
  self.assertEqual(audit(e,p,[],{})["validPregameForecasts"],0)
if __name__=="__main__":unittest.main()
