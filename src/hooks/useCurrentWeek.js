import { useState, useEffect } from 'react';
import { WEEK_LOCKS } from '../data/weekLocks.js';

/**
 * Returns the current NFL week number (1–18) based on the wall clock vs WEEK_LOCKS.
 *
 * Definition: the highest week N whose lock datetime has already passed.
 * Before any week has locked (pre-season), returns 1 so the UI has a valid default.
 * After Week 18 has locked, returns 18.
 *
 * Re-evaluates every 60 seconds so the app stays correct if left open across a lock boundary.
 *
 * @returns {number} 1–18
 */
export function useCurrentWeek() {
  const [currentWeek, setCurrentWeek] = useState(computeCurrentWeek);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentWeek(computeCurrentWeek());
    }, 60_000);
    return () => clearInterval(interval);
  }, []);

  return currentWeek;
}

function computeCurrentWeek() {
  const now = new Date();
  for (let week = 18; week >= 1; week--) {
    if (new Date(WEEK_LOCKS[week]) <= now) {
      return week;
    }
  }
  return 1; // Before season starts — default to Week 1
}
