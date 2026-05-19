import { useState, useEffect } from 'react';
import { doc, collection, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase/config.js';

/**
 * Subscribe to results/2026 in real time.
 * @returns {{ results: { games: Object, lastUpdated: Timestamp }|null, loading: boolean }}
 */
export function useResults() {
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'results', '2026'), (snap) => {
      setResults(snap.exists() ? snap.data() : { games: {}, lastUpdated: null });
      setLoading(false);
    });
    return unsub;
  }, []);

  return { results, loading };
}

/**
 * Subscribe to all documents in the picks collection in real time.
 * Each doc is keyed `{playerId}_{type}` (e.g. "uid123_preseason", "uid123_week_4").
 * @returns {{ picks: Array<Object>, loading: boolean }}
 */
export function useAllPicks() {
  const [picks,   setPicks]   = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'picks'), (snap) => {
      setPicks(snap.docs.map((d) => d.data()));
      setLoading(false);
    });
    return unsub;
  }, []);

  return { picks, loading };
}

/**
 * Subscribe to a single player's picks document in real time.
 * type is "preseason" or "week_N" (e.g. "week_4").
 * @param {string|null} playerId
 * @param {string|null} type
 * @returns {{ picks: Object|null, loading: boolean }}
 */
export function usePlayerPicks(playerId, type) {
  const [picks,   setPicks]   = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!playerId || !type) {
      setLoading(false);
      return;
    }
    setLoading(true); // reset while waiting for the new subscription to respond
    const docId = `${playerId}_${type}`;
    const unsub = onSnapshot(doc(db, 'picks', docId), (snap) => {
      setPicks(snap.exists() ? snap.data() : null);
      setLoading(false);
    });
    return unsub;
  }, [playerId, type]);

  return { picks, loading };
}

/**
 * Subscribe to season/2026 config in real time.
 * Contains ouLines per team, global locked flag, and per-week lock flags.
 * @returns {{ config: { ouLines: Object, locked: boolean, weekLocks: Object }|null, loading: boolean }}
 */
export function useSeasonConfig() {
  const [config,  setConfig]  = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'season', '2026'), (snap) => {
      setConfig(
        snap.exists()
          ? snap.data()
          : { ouLines: {}, locked: false, weekLocks: {} }
      );
      setLoading(false);
    });
    return unsub;
  }, []);

  return { config, loading };
}

/**
 * Subscribe to all player documents in real time.
 * @returns {{ players: Array<{ playerId: string, playerName: string, createdAt: Timestamp }>, loading: boolean }}
 */
export function usePlayers() {
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'players'), (snap) => {
      setPlayers(snap.docs.map((d) => d.data()));
      setLoading(false);
    });
    return unsub;
  }, []);

  return { players, loading };
}
