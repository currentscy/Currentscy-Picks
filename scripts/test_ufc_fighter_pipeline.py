#!/usr/bin/env python3
"""Offline UFC source-contract tests; no external network required."""
import unittest
from ufc_fighter_pipeline import collect, fighter_links, parse_profile

ID="0123456789abcdef0123456789abcdef"
URL="http://ufcstats.com/fighter-details/"+ID
ROSTER='<a href="'+URL+'">Test Fighter</a>'
PROFILE='<i>SLpM:</i> 4.50 <i>Str. Acc.:</i> 45% <i>TD Def.:</i> 77%'

class UFCPipelineTests(unittest.TestCase):
    def test_fighter_id(self):
        found=fighter_links(ROSTER)
        self.assertEqual(found[ID]["name"],"Test Fighter")
    def test_profile_metrics_are_numeric(self):
        result=parse_profile(PROFILE,{"id":ID,"name":"Test Fighter","url":URL},"2026-01-01T00:00:00+00:00")
        self.assertEqual(result["metrics"]["strikesLandedPerMinute"],4.5)
        self.assertEqual(result["metrics"]["strikingAccuracy"],0.45)
        self.assertEqual(result["metrics"]["takedownDefense"],0.77)
        self.assertEqual(result["verification"],"single-source-unconfirmed")
    def test_missing_names_are_explicit(self):
        result=collect(["Unknown Fighter"],fetcher=lambda url:"")
        self.assertEqual(result["unmatchedNames"],["Unknown Fighter"])
        self.assertEqual(result["fighters"],[])
    def test_provider_error_is_not_silenced(self):
        def fail(url): raise RuntimeError("Provider offline")
        result=collect(["Test Fighter"],fetcher=fail)
        self.assertTrue(result["failures"])
        self.assertEqual(result["quality"]["fighterCount"],0)
if __name__=="__main__":unittest.main()
