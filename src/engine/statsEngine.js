/**
 * Stats Engine — pure functions only.
 * No Firestore calls, no React, no side effects.
 * Components fetch data via hooks and pass it in.
 *
 * Data shapes expected by every function:
 *   picks    — Array of pick documents from Firestore (useAllPicks).
 *              Each doc: { playerId, type, picks: { [gameId]: teamId }, ... }
 *              type is "preseason" or "week_N" (e.g. "week_4").
 *   results  — results/2026 document: { games: { [gameId]: teamId }, lastUpdated }
 *   schedule — Array of game objects from schedule2026.js
 */

import { TEAMS } from '../data/teams.js';

// TODO: Replace away-team-wins upset definition with record-based definition after Week 4.
// See NFL_PICKEMS_MASTER_SPEC.md for full details.

// ── Private helpers ────────────────────────────────────────────────────────

function getPicksDoc(allPicks, playerId, docType) {
  return allPicks.find(p => p.playerId === playerId && p.type === docType) ?? null;
}

function weekFromGameId(gameId) {
  const m = gameId.match(/_W(\d+)_/);
  return m ? parseInt(m[1], 10) : null;
}

function countCorrect(picksMap, resultsMap) {
  let correct = 0, total = 0;
  for (const [gameId, picked] of Object.entries(picksMap)) {
    if (resultsMap[gameId] === undefined) continue;
    total++;
    if (picked === resultsMap[gameId]) correct++;
  }
  return { correct, total };
}

function safePct(correct, total) {
  return total > 0 ? correct / total : null;
}

/** Merge all week_N pick maps for a player into a single flat map. */
function allWeeklyPicksMap(allPicks, playerId) {
  const map = {};
  for (const doc of allPicks) {
    if (doc.playerId === playerId && doc.type.startsWith('week_')) {
      Object.assign(map, doc.picks ?? {});
    }
  }
  return map;
}

/** Sorted list of unique week numbers that have at least one result. */
function resolvedWeeks(results) {
  const weeks = new Set();
  for (const gameId of Object.keys(results?.games ?? {})) {
    const w = weekFromGameId(gameId);
    if (w !== null) weeks.add(w);
  }
  return [...weeks].sort((a, b) => a - b);
}

/** Filter results.games to only games belonging to a given week. */
function weekResultsMap(results, week) {
  return Object.fromEntries(
    Object.entries(results?.games ?? {}).filter(
      ([id]) => weekFromGameId(id) === week
    )
  );
}

// ── Public API ─────────────────────────────────────────────────────────────

/**
 * Accuracy for a player's weekly picks in a single week.
 * @param {Object[]} picks - all picks documents
 * @param {Object}   results - results/2026 document
 * @param {string}   playerId
 * @param {number}   week - 1-18
 * @returns {{ correct: number, total: number, pct: number|null }}
 */
export function weeklyAccuracy(picks, results, playerId, week) {
  const doc = getPicksDoc(picks, playerId, `week_${week}`);
  if (!doc) return { correct: 0, total: 0, pct: null };
  const { correct, total } = countCorrect(doc.picks ?? {}, weekResultsMap(results, week));
  return { correct, total, pct: safePct(correct, total) };
}

/**
 * Overall accuracy for a player across all games that have results.
 * @param {Object[]} picks
 * @param {Object}   results
 * @param {string}   playerId
 * @param {'preseason'|'weekly'} pickType
 * @returns {{ correct: number, total: number, pct: number|null }}
 */
export function overallAccuracy(picks, results, playerId, pickType) {
  const allGames = results?.games ?? {};

  if (pickType === 'preseason') {
    const doc = getPicksDoc(picks, playerId, 'preseason');
    if (!doc) return { correct: 0, total: 0, pct: null };
    const { correct, total } = countCorrect(doc.picks ?? {}, allGames);
    return { correct, total, pct: safePct(correct, total) };
  }

  const picksMap = allWeeklyPicksMap(picks, playerId);
  const { correct, total } = countCorrect(picksMap, allGames);
  return { correct, total, pct: safePct(correct, total) };
}

/**
 * Rolling accuracy over the most recent `windowSize` weeks of weekly picks.
 * @param {Object[]} picks
 * @param {Object}   results
 * @param {string}   playerId
 * @param {number}   currentWeek - the latest week to include
 * @param {number}   [windowSize=4]
 * @returns {{ correct: number, total: number, pct: number|null, weeks: [number, number] }}
 */
export function rollingAccuracy(picks, results, playerId, currentWeek, windowSize = 4) {
  const startWeek = Math.max(1, currentWeek - windowSize + 1);
  let correct = 0, total = 0;
  for (let w = startWeek; w <= currentWeek; w++) {
    const acc = weeklyAccuracy(picks, results, playerId, w);
    correct += acc.correct;
    total   += acc.total;
  }
  return { correct, total, pct: safePct(correct, total), weeks: [startWeek, currentWeek] };
}

/**
 * Current consecutive correct-or-incorrect pick streak, evaluated
 * from the most recent resolved game backwards.
 * @param {Object[]} picks
 * @param {Object}   results
 * @param {string}   playerId
 * @param {'preseason'|'weekly'} pickType
 * @returns {{ count: number, type: 'correct'|'incorrect'|null }}
 */
export function currentStreak(picks, results, playerId, pickType) {
  const allGames = results?.games ?? {};
  if (Object.keys(allGames).length === 0) return { count: 0, type: null };

  // Sort all resolved games chronologically (week first, then alphabetically within week)
  const resolved = Object.entries(allGames).sort(([a], [b]) => {
    const wa = weekFromGameId(a) ?? 0;
    const wb = weekFromGameId(b) ?? 0;
    return wa !== wb ? wa - wb : a.localeCompare(b);
  });

  const picksMap =
    pickType === 'preseason'
      ? (getPicksDoc(picks, playerId, 'preseason')?.picks ?? {})
      : allWeeklyPicksMap(picks, playerId);

  let count = 0;
  let streakType = null;

  for (let i = resolved.length - 1; i >= 0; i--) {
    const [gameId, result] = resolved[i];
    const picked = picksMap[gameId];
    if (picked === undefined) continue; // player didn't pick this game

    const isCorrect = picked === result;
    if (streakType === null) streakType = isCorrect ? 'correct' : 'incorrect';

    const continuesStreak =
      (isCorrect && streakType === 'correct') ||
      (!isCorrect && streakType === 'incorrect');

    if (continuesStreak) count++;
    else break;
  }

  return { count, type: streakType };
}

/**
 * Week-by-week comparison of two players' weekly pick accuracy.
 * Only includes weeks that have at least one result.
 * @param {Object[]} picks
 * @param {Object}   results
 * @param {string}   player1Id
 * @param {string}   player2Id
 * @returns {Array<{ week: number, p1: Object, p2: Object, winner: string|'tie'|null }>}
 */
export function headToHeadWeekly(picks, results, player1Id, player2Id) {
  return resolvedWeeks(results).map(week => {
    const p1 = weeklyAccuracy(picks, results, player1Id, week);
    const p2 = weeklyAccuracy(picks, results, player2Id, week);

    let winner = null;
    if (p1.pct !== null && p2.pct === null) {
      winner = player1Id;
    } else if (p2.pct !== null && p1.pct === null) {
      winner = player2Id;
    } else if (p1.pct !== null && p2.pct !== null) {
      if (p1.pct > p2.pct)      winner = player1Id;
      else if (p2.pct > p1.pct) winner = player2Id;
      else                       winner = 'tie';
    }

    return { week, p1, p2, winner };
  });
}

/**
 * Season head-to-head record counted at the week level (most accurate player wins the week).
 * @param {Object[]} picks
 * @param {Object}   results
 * @param {string}   player1Id
 * @param {string}   player2Id
 * @returns {{ p1Wins: number, p2Wins: number, ties: number }}
 */
export function headToHeadRecord(picks, results, player1Id, player2Id) {
  let p1Wins = 0, p2Wins = 0, ties = 0;
  for (const { winner } of headToHeadWeekly(picks, results, player1Id, player2Id)) {
    if (winner === player1Id)      p1Wins++;
    else if (winner === player2Id) p2Wins++;
    else if (winner === 'tie')     ties++;
  }
  return { p1Wins, p2Wins, ties };
}

/**
 * Pick accuracy filtered to games where the home team is in `conf`.
 * Using home-team conference to cleanly partition all games into AFC and NFC.
 * @param {Object[]} picks
 * @param {Object}   results
 * @param {string}   playerId
 * @param {'AFC'|'NFC'} conf
 * @param {Object[]} schedule
 * @param {'preseason'|'weekly'} [pickType='weekly']
 * @returns {{ correct: number, total: number, pct: number|null }}
 */
export function conferenceAccuracy(picks, results, playerId, conf, schedule, pickType = 'weekly') {
  const confGameIds = new Set(
    schedule.filter(g => TEAMS[g.homeTeam]?.conf === conf).map(g => g.gameId)
  );
  const allGames = results?.games ?? {};
  const confResults = Object.fromEntries(
    Object.entries(allGames).filter(([id]) => confGameIds.has(id))
  );

  const picksMap =
    pickType === 'preseason'
      ? (getPicksDoc(picks, playerId, 'preseason')?.picks ?? {})
      : allWeeklyPicksMap(picks, playerId);

  const { correct, total } = countCorrect(picksMap, confResults);
  return { correct, total, pct: safePct(correct, total) };
}

/**
 * Pick accuracy filtered to games where the home team is in `div`.
 * @param {Object[]} picks
 * @param {Object}   results
 * @param {string}   playerId
 * @param {string}   div - e.g. 'AFC West', 'NFC East'
 * @param {Object[]} schedule
 * @param {'preseason'|'weekly'} [pickType='weekly']
 * @returns {{ correct: number, total: number, pct: number|null }}
 */
export function divisionAccuracy(picks, results, playerId, div, schedule, pickType = 'weekly') {
  const [conf, divName] = div.split(' ');
  const divGameIds = new Set(
    schedule
      .filter(g => TEAMS[g.homeTeam]?.conf === conf && TEAMS[g.homeTeam]?.div === divName)
      .map(g => g.gameId)
  );
  const allGames = results?.games ?? {};
  const divResults = Object.fromEntries(
    Object.entries(allGames).filter(([id]) => divGameIds.has(id))
  );

  const picksMap =
    pickType === 'preseason'
      ? (getPicksDoc(picks, playerId, 'preseason')?.picks ?? {})
      : allWeeklyPicksMap(picks, playerId);

  const { correct, total } = countCorrect(picksMap, divResults);
  return { correct, total, pct: safePct(correct, total) };
}

/**
 * All games where the away team won (current upset definition).
 * TODO: Replace away-team-wins definition with record-based definition after Week 4.
 * @param {Object}   results
 * @param {Object[]} schedule
 * @returns {Array<{ gameId: string, week: number, winner: string, game: Object }>}
 */
export function upsetGames(results, schedule) {
  const gameMap = new Map(schedule.map(g => [g.gameId, g]));
  return Object.entries(results?.games ?? {})
    .filter(([gameId, winner]) => {
      const game = gameMap.get(gameId);
      return game && winner === game.awayTeam;
    })
    .map(([gameId, winner]) => ({
      gameId,
      week: weekFromGameId(gameId),
      winner,
      game: gameMap.get(gameId),
    }));
}

/**
 * How accurately a player called upsets, broken down by pick type.
 * @param {Object[]} picks
 * @param {Object}   results
 * @param {string}   playerId
 * @param {Object[]} schedule
 * @returns {{ weekly: { correct, total, pct }, preseason: { correct, total, pct } }}
 */
export function upsetPickAccuracy(picks, results, playerId, schedule) {
  const upsets = upsetGames(results, schedule);
  if (upsets.length === 0) {
    const empty = { correct: 0, total: 0, pct: null };
    return { weekly: empty, preseason: empty };
  }

  const weeklyMap   = allWeeklyPicksMap(picks, playerId);
  const preDoc      = getPicksDoc(picks, playerId, 'preseason');
  const preMap      = preDoc?.picks ?? {};

  let wCorrect = 0, wTotal = 0;
  let pCorrect = 0, pTotal = 0;

  for (const { gameId, winner } of upsets) {
    if (weeklyMap[gameId] !== undefined) {
      wTotal++;
      if (weeklyMap[gameId] === winner) wCorrect++;
    }
    if (preMap[gameId] !== undefined) {
      pTotal++;
      if (preMap[gameId] === winner) pCorrect++;
    }
  }

  return {
    weekly:   { correct: wCorrect, total: wTotal, pct: safePct(wCorrect, wTotal) },
    preseason: { correct: pCorrect, total: pTotal, pct: safePct(pCorrect, pTotal) },
  };
}

/**
 * Count predicted wins per team derived from a player's pre-season picks.
 * Returns an object keyed by team ID.
 * @param {Object[]} picks
 * @param {string}   playerId
 * @param {Object[]} schedule
 * @returns {{ [teamId: string]: number }}
 */
export function predictedWinsFromPicks(picks, playerId, schedule) {
  const wins = {};
  for (const { homeTeam, awayTeam } of schedule) {
    wins[homeTeam] = wins[homeTeam] ?? 0;
    wins[awayTeam] = wins[awayTeam] ?? 0;
  }

  const doc = getPicksDoc(picks, playerId, 'preseason');
  for (const winner of Object.values(doc?.picks ?? {})) {
    if (wins[winner] !== undefined) wins[winner]++;
  }

  return wins;
}

/**
 * Current win pace for a team based on results so far.
 * Projects a final win total over a 17-game season.
 * @param {Object}   results
 * @param {Object[]} schedule
 * @param {string}   teamId
 * @returns {{ wins: number, played: number, projected: number|null }}
 */
export function ouPace(results, schedule, teamId) {
  const allGames = results?.games ?? {};
  const teamGames = schedule.filter(g => g.homeTeam === teamId || g.awayTeam === teamId);

  let wins = 0, played = 0;
  for (const game of teamGames) {
    if (allGames[game.gameId] === undefined) continue;
    played++;
    if (allGames[game.gameId] === teamId) wins++;
  }

  const totalGames = teamGames.length || 17;
  return {
    wins,
    played,
    projected: played === 0 || wins === 0 ? null : Math.round((wins / played) * totalGames * 10) / 10,
  };
}

/**
 * Compare a predicted win total to the O/U line.
 * @param {number}      predictedWins
 * @param {number|null} ouLine
 * @returns {'over'|'under'|'push'|null} null if no line is set
 */
export function ouStatus(predictedWins, ouLine) {
  if (ouLine == null) return null;
  if (predictedWins > ouLine) return 'over';
  if (predictedWins < ouLine) return 'under';
  return 'push';
}

/**
 * For each team with an O/U line, check whether the player's predicted
 * direction (over/under) matches the current win pace.
 * @param {Object[]} picks
 * @param {Object}   results
 * @param {Object}   ouLines - { [teamId]: number|null } from season/2026
 * @param {string}   playerId
 * @param {Object[]} schedule
 * @returns {{ correct: number, incorrect: number, tooEarly: number, total: number,
 *             pct: number|null, details: Object }}
 */
export function ouTrendingAccuracy(picks, results, ouLines, playerId, schedule) {
  const predicted = predictedWinsFromPicks(picks, playerId, schedule);
  let correct = 0, incorrect = 0, tooEarly = 0;
  const details = {};

  for (const [teamId, ouLine] of Object.entries(ouLines)) {
    if (!ouLine) { tooEarly++; details[teamId] = { status: 'no_line' }; continue; }

    const playerStatus = ouStatus(predicted[teamId] ?? 0, ouLine);
    const { projected, played } = ouPace(results, schedule, teamId);

    // No games played yet — genuinely too early to evaluate
    if (played === 0) {
      tooEarly++;
      details[teamId] = { playerStatus, status: 'too_early' };
      continue;
    }

    // projected is null when wins === 0 but games have been played;
    // treat as 0 wins projected (trending toward under against any real O/U line)
    const effectiveProjected = projected ?? 0;

    // Within 0.5 wins of the line = too close to call
    if (Math.abs(effectiveProjected - ouLine) <= 0.5) {
      tooEarly++;
      details[teamId] = { playerStatus, trendingStatus: 'push', status: 'too_early' };
      continue;
    }

    const trendingStatus = ouStatus(effectiveProjected, ouLine);
    if (playerStatus === trendingStatus) {
      correct++;
      details[teamId] = { playerStatus, trendingStatus, status: 'correct' };
    } else {
      incorrect++;
      details[teamId] = { playerStatus, trendingStatus, status: 'incorrect' };
    }
  }

  const total = correct + incorrect;
  return { correct, incorrect, tooEarly, total, pct: safePct(correct, total), details };
}

/**
 * The player's best and worst weeks by pick accuracy.
 * @param {Object[]} picks
 * @param {Object}   results
 * @param {string}   playerId
 * @param {'preseason'|'weekly'} pickType
 * @returns {{ best: Object|null, worst: Object|null }}
 */
export function bestAndWorstWeek(picks, results, playerId, pickType) {
  const preDoc = pickType === 'preseason'
    ? getPicksDoc(picks, playerId, 'preseason')
    : null;

  const weekStats = resolvedWeeks(results).map(week => {
    if (pickType === 'weekly') {
      return { week, ...weeklyAccuracy(picks, results, playerId, week) };
    }
    // preseason: compare the preseason picks for that week's games against results
    const wResults = weekResultsMap(results, week);
    const { correct, total } = countCorrect(preDoc?.picks ?? {}, wResults);
    return { week, correct, total, pct: safePct(correct, total) };
  }).filter(s => s.total > 0);

  if (weekStats.length === 0) return { best: null, worst: null };

  weekStats.sort((a, b) => b.pct - a.pct);
  return { best: weekStats[0], worst: weekStats[weekStats.length - 1] };
}

/**
 * Total number of games that have a result entered.
 * @param {Object} results
 * @returns {number}
 */
export function gamesDecided(results) {
  return Object.keys(results?.games ?? {}).length;
}

/**
 * Total number of schedule games that do not yet have a result.
 * @param {Object}   results
 * @param {Object[]} schedule
 * @returns {number}
 */
export function gamesRemaining(results, schedule) {
  const decided = new Set(Object.keys(results?.games ?? {}));
  return schedule.filter(g => !decided.has(g.gameId)).length;
}
