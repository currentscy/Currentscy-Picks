import importlib.util
import unittest
from pathlib import Path
spec=importlib.util.spec_from_file_location("ai_research",Path(__file__).with_name("ai-research-agent.py"))
ai=importlib.util.module_from_spec(spec);spec.loader.exec_module(ai)
class ResearchAgentTests(unittest.TestCase):
 def test_requires_forecast_before_start(self):
  event={"eventKey":"nba:1","sport":"nba","scheduledStart":"2026-11-20T20:00:00Z"}
  p={"gameKey":"nba:1","predictionId":"p","predictedAt":"2026-11-20T20:01:00Z","baselineProbability":.7}
  o={"predictionId":"p","verified":True,"result":1,"verifiedAt":"2026-11-20T23:00:00Z","sourceUrl":"https://example.org"}
  self.assertEqual(ai.evidence([p],[o],[event])[0],[])
 def test_requires_final_and_provenance(self):
  event={"eventKey":"nba:1","sport":"nba","scheduledStart":"2026-11-20T20:00:00Z"}
  p={"gameKey":"nba:1","predictionId":"p","predictedAt":"2026-11-20T19:00:00Z","baselineProbability":.7}
  o={"predictionId":"p","verified":True,"result":1,"verifiedAt":"2026-11-20T23:00:00Z","sourceUrl":"https://example.org"}
  scored,pending,invalid=ai.evidence([p],[o],[event])
  self.assertEqual(len(scored),1);self.assertAlmostEqual(scored[0]["brier"],.09)
  self.assertEqual(ai.summarize(scored,pending,invalid)["scored"],1)
  o["sourceUrl"]="invalid"
  self.assertEqual(len(ai.evidence([p],[o],[event])[2]),1)
 def test_no_results_no_learning_claim(self):
  self.assertEqual(ai.summarize([],[],[])["scored"],0)
if __name__=="__main__":unittest.main()
