import { useMemo } from 'react';
import { SCHEDULE } from '../data/schedule2026.js';

const WEEK_COUNT = 18;

/**
 * The week the UI should default to: the first week (starting from 1) whose
 * results are NOT yet fully entered. Once every game in week N has a result,
 * this advances to week N+1 — so as soon as all of week 2 is decided, it
 * returns 3. Before any results exist, returns 1. Once all 18 weeks are
 * fully decided, returns 18 (there's nowhere further to advance to).
 *
 * @param {{ games: Object }|null|undefined} results
 * @returns {number} 1–18
 */
export function useActiveWeek(results) {
  return useMemo(() => computeActiveWeek(results), [results]);
}

/** Pure version of the same logic, exported separately so it's unit-testable without React. */
export function computeActiveWeek(results) {
  const decided = results?.games ?? {};
  for (let week = 1; week <= WEEK_COUNT; week++) {
    const weekGames = SCHEDULE.filter(g => g.week === week);
    const fullyDecided =
      weekGames.length > 0 && weekGames.every(g => decided[g.gameId] !== undefined);
    if (!fullyDecided) return week;
  }
  return WEEK_COUNT;
}
