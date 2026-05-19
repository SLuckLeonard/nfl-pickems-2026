/**
 * Bracket Engine — pure functions only.
 * No Firestore, no React. Accepts picksMap ({ [gameId]: teamId }) directly
 * so the panel can update live from PreSeasonPickSheet's local state.
 *
 * TODO: implement full NFL tiebreaker rules (division record, conference record,
 * strength of victory, strength of schedule, net points, etc.).
 * Current tiebreaker order: head-to-head pick → alphabetical by team ID.
 */

import { TEAMS } from '../data/teams.js';

// ── Helpers ────────────────────────────────────────────────────────────────

/** Find the first regular-season game between two teams (order-agnostic). */
function findGame(team1, team2, schedule) {
  return schedule.find(
    g => (g.homeTeam === team1 && g.awayTeam === team2) ||
         (g.homeTeam === team2 && g.awayTeam === team1)
  ) ?? null;
}

/** Sort comparator using head-to-head pick then alphabetical as fallback. */
function breakTie(a, b, picksMap, schedule) {
  if (b.wins !== a.wins) return b.wins - a.wins;
  const game = findGame(a.teamId, b.teamId, schedule);
  if (game) {
    const pick = picksMap[game.gameId];
    if (pick === a.teamId) return -1;
    if (pick === b.teamId) return 1;
  }
  return a.teamId.localeCompare(b.teamId);
}

// ── Public API ─────────────────────────────────────────────────────────────

/**
 * Count predicted wins and losses per team from picked games only.
 * Games not yet picked are not counted toward either W or L.
 * @param {{ [gameId]: teamId }} picksMap
 * @param {Object[]} schedule
 * @returns {{ wins: { [teamId]: number }, losses: { [teamId]: number } }}
 */
export function predictedWinCounts(picksMap, schedule) {
  const wins   = {};
  const losses = {};

  for (const { homeTeam, awayTeam } of schedule) {
    wins[homeTeam]   = wins[homeTeam]   ?? 0;
    wins[awayTeam]   = wins[awayTeam]   ?? 0;
    losses[homeTeam] = losses[homeTeam] ?? 0;
    losses[awayTeam] = losses[awayTeam] ?? 0;
  }

  for (const game of schedule) {
    const pick = picksMap[game.gameId];
    if (!pick) continue;
    if (pick === game.homeTeam) {
      wins[game.homeTeam]++;
      losses[game.awayTeam]++;
    } else if (pick === game.awayTeam) {
      wins[game.awayTeam]++;
      losses[game.homeTeam]++;
    }
  }

  return { wins, losses };
}

/**
 * Build sorted division standings from a picks map.
 * Sorted: predicted wins desc, ties broken by head-to-head pick then alpha.
 * @returns {{ [divName: string]: Array<{ teamId, wins, losses }> }}
 */
export function getDivisionStandings(picksMap, schedule) {
  const { wins, losses } = predictedWinCounts(picksMap, schedule);
  const divs = {};

  for (const [teamId, team] of Object.entries(TEAMS)) {
    const key = `${team.conf} ${team.div}`;
    if (!divs[key]) divs[key] = [];
    divs[key].push({
      teamId,
      wins:   wins[teamId]   ?? 0,
      losses: losses[teamId] ?? 0,
    });
  }

  for (const teams of Object.values(divs)) {
    teams.sort((a, b) => breakTie(a, b, picksMap, schedule));
  }

  return divs;
}

/**
 * Derive the 7 playoff seeds for one conference.
 * Seeds 1–4: division winners (best record per division), sorted by wins.
 * Seeds 5–7: top 3 non-division-winners by wins.
 *
 * @param {{ [divName]: Array<{teamId, wins, losses}> }} divisionStandings
 * @param {'AFC'|'NFC'} conf
 * @param {{ [gameId]: teamId }} picksMap
 * @param {Object[]} schedule
 * @returns {Array<{ teamId, seed, wins, losses }>}
 */
export function getPlayoffSeeds(divisionStandings, conf, picksMap, schedule) {
  const confDivs   = Object.entries(divisionStandings).filter(([k]) => k.startsWith(conf));
  const divWinners = confDivs.map(([, teams]) => teams[0]);
  const nonWinners  = confDivs.flatMap(([, teams]) => teams.slice(1));

  divWinners.sort((a, b) => breakTie(a, b, picksMap, schedule));
  nonWinners.sort((a, b) => breakTie(a, b, picksMap, schedule));

  return [...divWinners.slice(0, 4), ...nonWinners.slice(0, 3)].map((t, i) => ({
    teamId: t.teamId,
    seed:   i + 1,
    wins:   t.wins,
    losses: t.losses,
  }));
}

// ── Bracket matchup helpers ────────────────────────────────────────────────

/**
 * Return the 3 Wild Card matchup descriptors for a conference.
 * WC1: 2v7, WC2: 3v6, WC3: 4v5. Seed 1 gets a bye.
 *
 * @param {Array<{ teamId, seed, wins, losses }>} seeds - 7 entries
 * @param {'AFC'|'NFC'} conf
 * @returns {Array<{ gameKey: string, top: seedObj, bottom: seedObj }>}
 */
export function getWildCardMatchups(seeds, conf) {
  const c = conf.toLowerCase();
  const s = n => seeds[n - 1] ?? null;
  return [
    { gameKey: `${c}_wc_1`, top: s(2), bottom: s(7) },
    { gameKey: `${c}_wc_2`, top: s(3), bottom: s(6) },
    { gameKey: `${c}_wc_3`, top: s(4), bottom: s(5) },
  ];
}

/**
 * Return the 2 Divisional matchup descriptors.
 * Requires all 3 WC picks; returns null-slot matchups if any WC pick is missing.
 *
 * Div1: seed 1 vs lowest-seeded WC winner
 * Div2: top two WC winners by seed
 *
 * @param {Array<{ teamId, seed }>} seeds
 * @param {{ [gameKey]: teamId }} bracketPicks
 * @param {'AFC'|'NFC'} conf
 * @returns {Array<{ gameKey: string, top: seedObj|null, bottom: seedObj|null }>}
 */
export function getDivisionalMatchups(seeds, bracketPicks, conf) {
  const c = conf.toLowerCase();
  const s = n => seeds[n - 1] ?? null;

  const wcMatchups = getWildCardMatchups(seeds, conf);
  const wcWinners  = wcMatchups.map(m => {
    const pick = bracketPicks[m.gameKey];
    if (pick === m.top?.teamId)    return m.top;
    if (pick === m.bottom?.teamId) return m.bottom;
    return null;
  });

  if (wcWinners.some(w => w === null)) {
    return [
      { gameKey: `${c}_div_1`, top: s(1), bottom: null },
      { gameKey: `${c}_div_2`, top: null, bottom: null },
    ];
  }

  const sorted = [...wcWinners].sort((a, b) => a.seed - b.seed);
  return [
    { gameKey: `${c}_div_1`, top: s(1), bottom: sorted[2] },
    { gameKey: `${c}_div_2`, top: sorted[0], bottom: sorted[1] },
  ];
}

/**
 * Return the Conference Championship matchup descriptor.
 *
 * @param {Array<{ teamId, seed }>} seeds
 * @param {{ [gameKey]: teamId }} bracketPicks
 * @param {'AFC'|'NFC'} conf
 * @returns {{ gameKey: string, top: seedObj|null, bottom: seedObj|null }}
 */
export function getChampionshipMatchup(seeds, bracketPicks, conf) {
  const c = conf.toLowerCase();
  const divMatchups = getDivisionalMatchups(seeds, bracketPicks, conf);

  function pickWinner(matchup) {
    const pick = bracketPicks[matchup.gameKey];
    if (!pick) return null;
    if (matchup.top?.teamId === pick)    return matchup.top;
    if (matchup.bottom?.teamId === pick) return matchup.bottom;
    return null;
  }

  return {
    gameKey: `${c}_conf`,
    top:    pickWinner(divMatchups[0]),
    bottom: pickWinner(divMatchups[1]),
  };
}

/**
 * Return the Super Bowl matchup descriptor.
 *
 * @param {Array} afcSeeds
 * @param {Array} nfcSeeds
 * @param {{ [gameKey]: teamId }} bracketPicks
 * @returns {{ gameKey: string, top: seedObj|null, bottom: seedObj|null }}
 */
export function getSuperBowlMatchup(afcSeeds, nfcSeeds, bracketPicks) {
  const afcChamp = getChampionshipMatchup(afcSeeds, bracketPicks, 'AFC');
  const nfcChamp = getChampionshipMatchup(nfcSeeds, bracketPicks, 'NFC');

  function pickWinner(matchup) {
    const pick = bracketPicks[matchup.gameKey];
    if (!pick) return null;
    if (matchup.top?.teamId === pick)    return matchup.top;
    if (matchup.bottom?.teamId === pick) return matchup.bottom;
    return null;
  }

  return {
    gameKey: 'super_bowl',
    top:    pickWinner(afcChamp),
    bottom: pickWinner(nfcChamp),
  };
}

/**
 * Sanitize bracket picks by clearing any picks whose teams are no longer
 * valid participants in that slot due to upstream pick changes.
 * Cascades top-down: WC → Div → Champ → Super Bowl.
 *
 * @param {{ [gameKey]: teamId }} bracketPicks
 * @param {Array} afcSeeds
 * @param {Array} nfcSeeds
 * @returns {{ [gameKey]: teamId }} sanitized copy
 */
export function sanitizeBracketPicks(bracketPicks, afcSeeds, nfcSeeds) {
  const picks = { ...bracketPicks };

  for (const [conf, seeds] of [['AFC', afcSeeds], ['NFC', nfcSeeds]]) {
    const c = conf.toLowerCase();

    // WC: valid teams are fixed from seeds — clear invalid picks
    const wcMatchups = getWildCardMatchups(seeds, conf);
    for (const m of wcMatchups) {
      const pick = picks[m.gameKey];
      if (pick && pick !== m.top?.teamId && pick !== m.bottom?.teamId) {
        delete picks[m.gameKey];
      }
    }

    // Divisional: recompute matchups from current WC picks, clear invalid
    const divMatchups = getDivisionalMatchups(seeds, picks, conf);
    for (const m of divMatchups) {
      const pick = picks[m.gameKey];
      if (pick) {
        const valid = [m.top?.teamId, m.bottom?.teamId].filter(Boolean);
        if (!valid.includes(pick)) delete picks[m.gameKey];
      }
    }

    // Championship: recompute from current Div picks, clear invalid
    const champMatchup = getChampionshipMatchup(seeds, picks, conf);
    const champPick = picks[`${c}_conf`];
    if (champPick) {
      const valid = [champMatchup.top?.teamId, champMatchup.bottom?.teamId].filter(Boolean);
      if (!valid.includes(champPick)) delete picks[`${c}_conf`];
    }
  }

  // Super Bowl: recompute from current conf picks, clear invalid
  const sbMatchup = getSuperBowlMatchup(afcSeeds, nfcSeeds, picks);
  const sbPick = picks['super_bowl'];
  if (sbPick) {
    const valid = [sbMatchup.top?.teamId, sbMatchup.bottom?.teamId].filter(Boolean);
    if (!valid.includes(sbPick)) delete picks['super_bowl'];
  }

  return picks;
}
