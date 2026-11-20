import unittest
from stage5_archive import snapshot
E={"events":[{"eventKey":"nba:1","sport":"nba","scheduledStart":"2026-11-21T01:00:00Z",
 "observedAt":"2026-11-20T22:00:00Z","sourceUrl":"https://example.org/score",
 "teams":[{"sourceTeamId":"1","homeAway":"home","score":None},{"sourceTeamId":"2","homeAway":"away","score":None}],"completed":False}]}
class ArchiveTests(unittest.TestCase):
 def test_pregame_archive(self):
  import datetime as dt
  m,r=snapshot(E,now=dt.datetime(2026,11,20,23,tzinfo=dt.timezone.utc))
  self.assertEqual(len(r),1)
  self.assertEqual(r[0][1]["phase"],"pregame")
  self.assertIsNone(r[0][1]["teams"][0]["score"])
 def test_dedup(self):
  import datetime as dt
  now=dt.datetime(2026,11,20,23,tzinfo=dt.timezone.utc)
  m,r=snapshot(E,now=now)
  m2,r2=snapshot(E,m,now)
  self.assertEqual(len(r2),0)
 def test_postgame_requires_final(self):
  import datetime as dt
  e={"events":[dict(E["events"][0],observedAt="2026-11-21T05:00:00Z",completed=True)]}
  m,r=snapshot(e,now=dt.datetime(2026,11,21,6,tzinfo=dt.timezone.utc))
  self.assertEqual(len(r),0)
 def test_postgame_final(self):
  import datetime as dt
  e={"events":[dict(E["events"][0],observedAt="2026-11-21T05:00:00Z",completed=True,teams=[
   {"sourceTeamId":"1","homeAway":"home","score":"100"},{"sourceTeamId":"2","homeAway":"away","score":"95"}])]}
  m,r=snapshot(e,now=dt.datetime(2026,11,21,6,tzinfo=dt.timezone.utc))
  self.assertEqual(r[0][1]["phase"],"postgame")
 def test_future_observation_excluded(self):
  import datetime as dt
  m,r=snapshot(E,now=dt.datetime(2026,11,20,20,tzinfo=dt.timezone.utc))
  self.assertEqual(len(r),0)
if __name__=="__main__":unittest.main()
