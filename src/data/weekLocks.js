// First game kickoff per week (Eastern Time, ISO 8601).
// DST ends Nov 1, 2026 — weeks 9+ use -05:00 offset.
// Developer note: verify all Thursday night game times (most TNF = 8:15 PM ET).
// International games (London, Paris, etc.) kick early local time but should NOT
// affect the weekly lock if a later US game kicks first — always use the earliest
// kickoff of the week regardless of timezone.
export const WEEK_LOCKS = {
  1:  '2026-09-09T20:20:00-04:00',  // SEA vs NE, Wednesday Night
  2:  '2026-09-17T20:15:00-04:00',  // BUF vs DET, Thursday Night
  3:  '2026-09-24T20:15:00-04:00',  // Thursday Night Game
  4:  '2026-10-01T20:15:00-04:00',  // Thursday Night Game
  5:  '2026-10-08T20:15:00-04:00',
  6:  '2026-10-15T20:15:00-04:00',
  7:  '2026-10-22T20:15:00-04:00',
  8:  '2026-10-29T20:15:00-04:00',
  9:  '2026-11-05T20:15:00-05:00',  // DST ends Nov 1
  10: '2026-11-12T20:15:00-05:00',
  11: '2026-11-19T20:15:00-05:00',
  12: '2026-11-25T20:00:00-05:00',  // Thanksgiving Eve (Wed), LAR vs GB
  13: '2026-12-03T20:15:00-05:00',
  14: '2026-12-10T20:15:00-05:00',
  15: '2026-12-17T20:15:00-05:00',
  16: '2026-12-24T20:15:00-05:00',  // Christmas Eve
  17: '2026-12-31T20:15:00-05:00',
  18: '2027-01-08T20:15:00-05:00',
};

export const PRESEASON_LOCK = '2026-09-09T20:20:00-04:00';

export function isLocked(weekNumber) {
  const lockTime = weekNumber === 'preseason'
    ? PRESEASON_LOCK
    : WEEK_LOCKS[weekNumber];
  if (!lockTime) return false;
  return new Date() >= new Date(lockTime);
}
