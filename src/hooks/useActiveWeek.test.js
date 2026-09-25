import { describe, it, expect } from 'vitest';
import { computeActiveWeek } from './useActiveWeek.js';
import { SCHEDULE } from '../data/schedule2026.js';

const week1Games = SCHEDULE.filter(g => g.week === 1);
const week2Games = SCHEDULE.filter(g => g.week === 2);

/** Build a results.games map with every game in `games` assigned the home team as winner. */
function fullyDecide(games) {
  return Object.fromEntries(games.map(g => [g.gameId, g.homeTeam]));
}

describe('computeActiveWeek', () => {
  it('returns 1 when there are no results yet', () => {
    expect(computeActiveWeek(null)).toBe(1);
    expect(computeActiveWeek({ games: {} })).toBe(1);
  });

  it('stays on week 1 while it is only partially decided', () => {
    const partial = fullyDecide(week1Games.slice(0, -1)); // all but the last game
    expect(computeActiveWeek({ games: partial })).toBe(1);
  });

  it('advances to week 2 once week 1 is fully decided', () => {
    const games = fullyDecide(week1Games);
    expect(computeActiveWeek({ games })).toBe(2);
  });

  it('advances to week 3 once weeks 1 and 2 are fully decided', () => {
    const games = { ...fullyDecide(week1Games), ...fullyDecide(week2Games) };
    expect(computeActiveWeek({ games })).toBe(3);
  });

  it('caps at week 18 when every week is fully decided', () => {
    const games = fullyDecide(SCHEDULE);
    expect(computeActiveWeek({ games })).toBe(18);
  });
});
