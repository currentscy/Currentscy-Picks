// Stage 1–3 evidence gate. Pure functions; no network calls or production model changes.
const SPORTS = new Set(['nfl','nba','ncaa_football','soccer','nhl','mlb','tennis','ufc']);
const ISO = value => typeof value === 'string' && Number.isFinite(Date.parse(value));
const stamp = value => Date.parse(value);
const fail = (errors, condition, message) => { if (!condition) errors.push(message); };
export function validateEvent(event) {
  const errors = [];
  fail(errors, SPORTS.has(event?.sport), 'unsupported sport');
  fail(errors, typeof event?.eventId === 'string' && !!event.eventId.trim(), 'missing eventId');
  fail(errors, Array.isArray(event?.participants) && event.participants.length === 2 && event.participants.every(p => typeof p?.id === 'string' && !!p.id.trim()), 'invalid participants');
  fail(errors, ISO(event?.startTime), 'invalid startTime');
  fail(errors, typeof event?.source === 'string' && !!event.source.trim(), 'missing source');
  fail(errors, ISO(event?.retrievedAt), 'invalid retrievedAt');
  if (ISO(event?.startTime) && ISO(event?.retrievedAt)) fail(errors, stamp(event.retrievedAt) <= stamp(event.startTime) || event.phase === 'live' || event.phase === 'final', 'pregame event retrieved after start');
  if (event?.sport === 'ufc') fail(errors, typeof event.fightId === 'string' && !!event.fightId.trim(), 'missing individual fightId');
  if (event?.sport === 'tennis') fail(errors, typeof event.matchId === 'string' && !!event.matchId.trim(), 'missing individual matchId');
  return {ok:errors.length===0,errors};
}
export function validateObservation(observation, event, cutoff) {
  const errors = [...validateEvent(event).errors];
  fail(errors, observation?.eventId === event?.eventId, 'observation event mismatch');
  fail(errors, typeof observation?.participantId === 'string' && event?.participants?.some(p => p.id === observation.participantId), 'participant not in event');
  fail(errors, typeof observation?.playerId === 'string' && !!observation.playerId.trim(), 'missing player identity');
  fail(errors, typeof observation?.source === 'string' && !!observation.source.trim(), 'missing observation source');
  fail(errors, ISO(observation?.retrievedAt), 'invalid observation retrieval timestamp');
  fail(errors, ISO(cutoff), 'invalid prediction cutoff');
  if (ISO(observation?.retrievedAt) && ISO(cutoff)) fail(errors, stamp(observation.retrievedAt) <= stamp(cutoff), 'future evidence leakage');
  fail(errors, typeof observation?.season === 'string' && observation.season === event?.season, 'season mismatch');
  fail(errors, ['confirmed','probable','unknown'].includes(observation?.lineupStatus), 'lineup status not explicit');
  fail(errors, typeof observation?.statSource === 'string' && !!observation.statSource.trim(), 'missing statistics provenance');
  return {ok:errors.length===0,errors};
}
export function validateSelections(legs, eligibleMarkets) {
  const errors=[];
  fail(errors, Array.isArray(legs) && [3,5].includes(legs.length), 'selection must have 3 or 5 legs');
  const seen = new Set();
  for (const leg of Array.isArray(legs)?legs:[]) {
    const key = [leg.eventId,leg.marketId,leg.outcomeId].join(':');
    fail(errors, !seen.has(key), 'duplicate leg');
    seen.add(key);
    fail(errors, typeof leg.marketId === 'string' && eligibleMarkets?.has(leg.marketId), 'market not independently verified eligible');
    fail(errors, Number.isFinite(leg.probability) && leg.probability >= 0 && leg.probability <= 1, 'invalid probability');
  }
  return {ok:errors.length===0,errors};
}
export function validateSimulation(run) {
  const errors=[];
  fail(errors, run?.trials === 100000, '100000 completed trials not verified');
  fail(errors, Number.isInteger(run?.completedTrials) && run.completedTrials === run.trials, 'completed trial count mismatch');
  fail(errors, Number.isInteger(run?.successes) && run.successes >= 0 && run.successes <= run.completedTrials, 'invalid success count');
  if (errors.length===0) fail(errors, Math.abs(run.probability - run.successes/run.completedTrials) < 1e-10, 'probability does not match simulated outcomes');
  return {ok:errors.length===0,errors};
}
