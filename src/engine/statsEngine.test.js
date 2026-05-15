import { describe, it, expect } from 'vitest';
import {
  weeklyAccuracy,
  overallAccuracy,
  rollingAccuracy,
  currentStreak,
  headToHeadWeekly,
  headToHeadRecord,
  conferenceAccuracy,
  divisionAccuracy,
  upsetGames,
  upsetPickAccuracy,
  predictedWinsFromPicks,
  ouPace,
  ouStatus,
  ouTrendingAccuracy,
  bestAndWorstWeek,
  gamesDecided,
  gamesRemaining,
} from './statsEngine.js';

// ── Shared mock data ───────────────────────────────────────────────────────

const P1 = 'player1';
const P2 = 'player2';

// 3 games across 2 weeks.
// W1: KC (AFC West) home vs DEN away → DEN wins (away = upset)
//     SEA (NFC West) home vs NE away → SEA wins (home wins)
// W2: BUF (AFC East) home vs MIA away → BUF wins (no picks yet from P2 for week 2)
const SCHEDULE = [
  { gameId: '2026_W1_KC_DEN',  week: 1, homeTeam: 'KC',  awayTeam: 'DEN', isInternational: false },
  { gameId: '2026_W1_SEA_NE',  week: 1, homeTeam: 'SEA', awayTeam: 'NE',  isInternational: false },
  { gameId: '2026_W2_BUF_MIA', week: 2, homeTeam: 'BUF', awayTeam: 'MIA', isInternational: false },
];

const RESULTS = {
  games: {
    '2026_W1_KC_DEN':  'DEN',  // away wins = upset
    '2026_W1_SEA_NE':  'SEA',  // home wins
    '2026_W2_BUF_MIA': 'BUF',  // home wins
  },
};

// P1 weekly: 2/2 in W1 (both correct), 1/1 in W2
// P2 weekly: 1/2 in W1 (missed KC_DEN), 0 picks in W2
// P1 preseason: picked KC (wrong) + SEA (correct) + BUF (correct) → 2/3
// P2 preseason: picked DEN (correct) + NE (wrong) + MIA (wrong) → 1/3
const PICKS = [
  {
    playerId: P1, type: 'preseason',
    picks: {
      '2026_W1_KC_DEN':  'KC',   // wrong
      '2026_W1_SEA_NE':  'SEA',  // correct
      '2026_W2_BUF_MIA': 'BUF',  // correct
    },
  },
  {
    playerId: P1, type: 'week_1',
    picks: {
      '2026_W1_KC_DEN':  'DEN',  // correct
      '2026_W1_SEA_NE':  'SEA',  // correct
    },
  },
  {
    playerId: P1, type: 'week_2',
    picks: { '2026_W2_BUF_MIA': 'BUF' }, // correct
  },
  {
    playerId: P2, type: 'preseason',
    picks: {
      '2026_W1_KC_DEN':  'DEN',  // correct
      '2026_W1_SEA_NE':  'NE',   // wrong
      '2026_W2_BUF_MIA': 'MIA',  // wrong
    },
  },
  {
    playerId: P2, type: 'week_1',
    picks: {
      '2026_W1_KC_DEN':  'KC',   // wrong
      '2026_W1_SEA_NE':  'SEA',  // correct
    },
  },
  // P2 has no week_2 picks
];

// ── weeklyAccuracy ─────────────────────────────────────────────────────────

describe('weeklyAccuracy', () => {
  it('counts correct picks for the given week', () => {
    expect(weeklyAccuracy(PICKS, RESULTS, P1, 1)).toEqual({ correct: 2, total: 2, pct: 1 });
    expect(weeklyAccuracy(PICKS, RESULTS, P2, 1)).toEqual({ correct: 1, total: 2, pct: 0.5 });
  });

  it('returns null pct when no picks document exists', () => {
    expect(weeklyAccuracy(PICKS, RESULTS, P2, 2)).toEqual({ correct: 0, total: 0, pct: null });
  });

  it('returns null pct when no results exist for the week', () => {
    const noResults = { games: {} };
    expect(weeklyAccuracy(PICKS, noResults, P1, 1)).toEqual({ correct: 0, total: 0, pct: null });
  });
});

// ── overallAccuracy ────────────────────────────────────────────────────────

describe('overallAccuracy', () => {
  it('aggregates weekly picks across all weeks', () => {
    // P1: 2/2 (W1) + 1/1 (W2) = 3/3
    expect(overallAccuracy(PICKS, RESULTS, P1, 'weekly')).toEqual({ correct: 3, total: 3, pct: 1 });
    // P2: 1/2 (W1) + 0 picks W2 = 1/2
    expect(overallAccuracy(PICKS, RESULTS, P2, 'weekly')).toEqual({ correct: 1, total: 2, pct: 0.5 });
  });

  it('checks preseason picks against all results', () => {
    // P1 preseason: KC(wrong), SEA(correct), BUF(correct) → 2/3
    const p1 = overallAccuracy(PICKS, RESULTS, P1, 'preseason');
    expect(p1.correct).toBe(2);
    expect(p1.total).toBe(3);
    expect(p1.pct).toBeCloseTo(2 / 3);

    // P2 preseason: DEN(correct), NE(wrong), MIA(wrong) → 1/3
    const p2 = overallAccuracy(PICKS, RESULTS, P2, 'preseason');
    expect(p2.correct).toBe(1);
    expect(p2.total).toBe(3);
  });

  it('returns null pct for missing player', () => {
    expect(overallAccuracy(PICKS, RESULTS, 'nobody', 'preseason').pct).toBeNull();
  });
});

// ── rollingAccuracy ────────────────────────────────────────────────────────

describe('rollingAccuracy', () => {
  it('aggregates over the window', () => {
    // Window of 2 at week 2: W1 (2/2) + W2 (1/1) = 3/3
    expect(rollingAccuracy(PICKS, RESULTS, P1, 2, 2)).toMatchObject({ correct: 3, total: 3, pct: 1 });
  });

  it('respects the window boundary', () => {
    // Window of 1 at week 2: only W2 (1/1)
    expect(rollingAccuracy(PICKS, RESULTS, P1, 2, 1)).toMatchObject({ correct: 1, total: 1, weeks: [2, 2] });
  });
});

// ── currentStreak ──────────────────────────────────────────────────────────

describe('currentStreak', () => {
  it('reports a correct streak', () => {
    // P1 weekly: W1 both correct, W2 correct — streak = 3 correct
    const streak = currentStreak(PICKS, RESULTS, P1, 'weekly');
    expect(streak.type).toBe('correct');
    expect(streak.count).toBe(3);
  });

  it('reports streak starting from most recent game', () => {
    // P2 weekly: W1 game 1 wrong, W1 game 2 correct (alphabetical: KC_DEN < SEA_NE)
    // Last resolved game is SEA_NE (correct) — streak = 1 correct
    const streak = currentStreak(PICKS, RESULTS, P2, 'weekly');
    expect(streak.type).toBe('correct');
    expect(streak.count).toBe(1);
  });

  it('returns count 0 with null type when no results', () => {
    expect(currentStreak(PICKS, { games: {} }, P1, 'weekly')).toEqual({ count: 0, type: null });
  });
});

// ── headToHeadWeekly & headToHeadRecord ───────────────────────────────────

describe('headToHeadWeekly', () => {
  it('returns one entry per week with results', () => {
    const h2h = headToHeadWeekly(PICKS, RESULTS, P1, P2);
    expect(h2h).toHaveLength(2);
    expect(h2h[0].week).toBe(1);
    expect(h2h[1].week).toBe(2);
  });

  it('correctly identifies week winner', () => {
    const h2h = headToHeadWeekly(PICKS, RESULTS, P1, P2);
    // W1: P1 100% vs P2 50% → P1 wins
    expect(h2h[0].winner).toBe(P1);
    // W2: P1 100% vs P2 null (no picks) → P1 wins
    expect(h2h[1].winner).toBe(P1);
  });
});

describe('headToHeadRecord', () => {
  it('counts week wins correctly', () => {
    const record = headToHeadRecord(PICKS, RESULTS, P1, P2);
    expect(record.p1Wins).toBe(2);
    expect(record.p2Wins).toBe(0);
    expect(record.ties).toBe(0);
  });
});

// ── conferenceAccuracy & divisionAccuracy ─────────────────────────────────

describe('conferenceAccuracy', () => {
  it('filters to games where homeTeam is in the given conference', () => {
    // AFC home game: 2026_W1_KC_DEN (result: DEN)
    //   P1 weekly picked DEN → correct
    // AFC home game: 2026_W2_BUF_MIA (result: BUF)
    //   P1 weekly picked BUF → correct
    // NFC home game: 2026_W1_SEA_NE (result: SEA)
    //   NOT counted in AFC
    const afc = conferenceAccuracy(PICKS, RESULTS, P1, 'AFC', SCHEDULE, 'weekly');
    expect(afc).toEqual({ correct: 2, total: 2, pct: 1 });

    const nfc = conferenceAccuracy(PICKS, RESULTS, P1, 'NFC', SCHEDULE, 'weekly');
    expect(nfc).toEqual({ correct: 1, total: 1, pct: 1 });
  });
});

describe('divisionAccuracy', () => {
  it('filters to games where homeTeam is in the given division', () => {
    // AFC West home games: 2026_W1_KC_DEN (KC is AFC West)
    // P1 weekly picked DEN (correct)
    const afcWest = divisionAccuracy(PICKS, RESULTS, P1, 'AFC West', SCHEDULE, 'weekly');
    expect(afcWest).toEqual({ correct: 1, total: 1, pct: 1 });
  });
});

// ── upsetGames & upsetPickAccuracy ─────────────────────────────────────────

describe('upsetGames', () => {
  it('finds games where away team won', () => {
    const upsets = upsetGames(RESULTS, SCHEDULE);
    expect(upsets).toHaveLength(1);
    expect(upsets[0].gameId).toBe('2026_W1_KC_DEN');
    expect(upsets[0].winner).toBe('DEN');
    expect(upsets[0].week).toBe(1);
  });

  it('returns empty array when no results', () => {
    expect(upsetGames({ games: {} }, SCHEDULE)).toHaveLength(0);
  });
});

describe('upsetPickAccuracy', () => {
  it('checks if players called the upset', () => {
    const p1 = upsetPickAccuracy(PICKS, RESULTS, P1, SCHEDULE);
    // P1 weekly picked DEN (correct upset call)
    expect(p1.weekly).toEqual({ correct: 1, total: 1, pct: 1 });
    // P1 preseason picked KC (missed the upset)
    expect(p1.preseason).toEqual({ correct: 0, total: 1, pct: 0 });

    const p2 = upsetPickAccuracy(PICKS, RESULTS, P2, SCHEDULE);
    // P2 weekly picked KC (missed the upset)
    expect(p2.weekly).toEqual({ correct: 0, total: 1, pct: 0 });
    // P2 preseason picked DEN (correct upset call)
    expect(p2.preseason).toEqual({ correct: 1, total: 1, pct: 1 });
  });
});

// ── predictedWinsFromPicks ─────────────────────────────────────────────────

describe('predictedWinsFromPicks', () => {
  it('counts predicted wins per team from preseason picks', () => {
    const p1Wins = predictedWinsFromPicks(PICKS, P1, SCHEDULE);
    expect(p1Wins['KC']).toBe(1);   // P1 picked KC to beat DEN
    expect(p1Wins['DEN']).toBe(0);
    expect(p1Wins['SEA']).toBe(1);  // P1 picked SEA to beat NE
    expect(p1Wins['BUF']).toBe(1);  // P1 picked BUF to beat MIA
  });

  it('initializes all schedule teams to 0 even if not picked to win', () => {
    const wins = predictedWinsFromPicks(PICKS, P1, SCHEDULE);
    expect(wins['NE']).toBe(0);
    expect(wins['MIA']).toBe(0);
  });

  it('returns all zeros for a player with no preseason picks', () => {
    const wins = predictedWinsFromPicks([], 'nobody', SCHEDULE);
    expect(Object.values(wins).every(v => v === 0)).toBe(true);
  });
});

// ── ouPace & ouStatus ──────────────────────────────────────────────────────

describe('ouPace', () => {
  it('calculates wins, played, and projects over 17 games', () => {
    // DEN: 1 win in 1 game played → projected = 1/1 * 3 games (schedule length = 3 for DEN)
    // DEN appears in: 2026_W1_KC_DEN only → 1 game total
    const den = ouPace(RESULTS, SCHEDULE, 'DEN');
    expect(den.wins).toBe(1);
    expect(den.played).toBe(1);
    // 1 win / 1 played * 1 total game = 1.0 projected
    expect(den.projected).toBe(1.0);
  });

  it('returns null projected when no games have been played', () => {
    const mia = ouPace(RESULTS, SCHEDULE, 'MIA');
    // MIA: 2026_W2_BUF_MIA result is BUF, not MIA
    expect(mia.wins).toBe(0);
    expect(mia.projected).toBeNull(); // 0 played → can't project
  });
});

describe('ouStatus', () => {
  it('returns over when predicted > line', () => {
    expect(ouStatus(12, 10.5)).toBe('over');
  });

  it('returns under when predicted < line', () => {
    expect(ouStatus(8, 10.5)).toBe('under');
  });

  it('returns push on exact match', () => {
    expect(ouStatus(10, 10)).toBe('push');
  });

  it('returns null when no line is set', () => {
    expect(ouStatus(10, null)).toBeNull();
    expect(ouStatus(10, undefined)).toBeNull();
  });
});

// ── ouTrendingAccuracy ─────────────────────────────────────────────────────

describe('ouTrendingAccuracy', () => {
  it('marks correct when player prediction matches pace direction', () => {
    // P1 predicted KC wins 1 game. O/U for KC = 10.5.
    // KC actual: 0 wins in 1 game played → projected 0 → trending UNDER.
    // P1 preseason picked KC to beat DEN → predicted KC wins 1 (of 1 game total here).
    // ouStatus(1, 10.5) = 'over' (P1 predicted over), trending 'under' → INCORRECT
    const ouLines = { KC: 10.5, DEN: 7.5 };
    const result = ouTrendingAccuracy(PICKS, RESULTS, ouLines, P1, SCHEDULE);
    expect(result.total).toBeGreaterThanOrEqual(0);
    // KC: P1 predicted 1 win vs line 10.5 → P1 status 'under'; pace: 0 wins in 1 game → projected 0 → 'under'. Match → correct.
    // Wait: predictedWins for KC from P1: P1 picked KC to beat DEN → KC gets 1 win
    // ouStatus(1, 10.5) = 'under' (1 < 10.5)
    // KC actual pace: 0 wins in 1 game → projected 0 → ouStatus(0, 10.5) = 'under'
    // Both 'under' → correct!
    expect(result.details['KC'].status).toBe('correct');
  });
});

// ── bestAndWorstWeek ───────────────────────────────────────────────────────

describe('bestAndWorstWeek', () => {
  it('finds best and worst weeks for weekly picks', () => {
    // P2 weekly: W1 = 50%, W2 = null (no picks) — only W1 counts
    const p2 = bestAndWorstWeek(PICKS, RESULTS, P2, 'weekly');
    expect(p2.best?.week).toBe(1);
    expect(p2.worst?.week).toBe(1); // only one week with picks
  });

  it('returns null when no games have results', () => {
    const result = bestAndWorstWeek(PICKS, { games: {} }, P1, 'weekly');
    expect(result.best).toBeNull();
    expect(result.worst).toBeNull();
  });

  it('works for preseason pick type', () => {
    // P1 preseason: W1 = 1/2 (50%), W2 = 1/1 (100%)
    const p1 = bestAndWorstWeek(PICKS, RESULTS, P1, 'preseason');
    expect(p1.best?.week).toBe(2);
    expect(p1.worst?.week).toBe(1);
  });
});

// ── gamesDecided & gamesRemaining ─────────────────────────────────────────

describe('gamesDecided', () => {
  it('counts games with a result', () => {
    expect(gamesDecided(RESULTS)).toBe(3);
    expect(gamesDecided({ games: {} })).toBe(0);
    expect(gamesDecided(null)).toBe(0);
  });
});

describe('gamesRemaining', () => {
  it('counts schedule games without a result', () => {
    // All 3 schedule games have results
    expect(gamesRemaining(RESULTS, SCHEDULE)).toBe(0);
  });

  it('counts correctly when some results are missing', () => {
    const partial = { games: { '2026_W1_KC_DEN': 'DEN' } };
    expect(gamesRemaining(partial, SCHEDULE)).toBe(2);
  });

  it('returns full schedule length when no results', () => {
    expect(gamesRemaining({ games: {} }, SCHEDULE)).toBe(3);
  });
});
