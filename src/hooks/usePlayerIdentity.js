import { useState, useEffect } from 'react';
import { signInAnonymously } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../firebase/config.js';

const KEY_ID   = 'nfl_player_id';
const KEY_NAME = 'nfl_player_name';

/**
 * Manages the current player's anonymous identity.
 *
 * States:
 *   isReady: false               — still reading localStorage (brief flash)
 *   isReady: true, playerId: null — first visit, show name-setup screen
 *   isReady: true, playerId: '…' — returning player, ready to use the app
 *
 * @returns {{ playerId: string|null, playerName: string|null, isReady: boolean,
 *             setupPlayer: (name: string) => Promise<void>,
 *             updatePlayerName: (name: string) => Promise<void> }}
 */
export function usePlayerIdentity() {
  const [playerId,   setPlayerId]   = useState(null);
  const [playerName, setPlayerName] = useState(null);
  const [isReady,    setIsReady]    = useState(false);

  useEffect(() => {
    const storedId   = localStorage.getItem(KEY_ID);
    const storedName = localStorage.getItem(KEY_NAME);
    if (storedId && storedName) {
      setPlayerId(storedId);
      setPlayerName(storedName);
    }
    setIsReady(true);
  }, []);

  /**
   * First-visit setup: sign in anonymously, persist identity everywhere.
   * Call this when the user submits their name on the setup screen.
   */
  async function setupPlayer(name) {
    const trimmed = name.trim();
    if (!trimmed) return;

    const credential = await signInAnonymously(auth);
    const uid = credential.user.uid;

    localStorage.setItem(KEY_ID,   uid);
    localStorage.setItem(KEY_NAME, trimmed);

    await setDoc(doc(db, 'players', uid), {
      playerId:   uid,
      playerName: trimmed,
      createdAt:  serverTimestamp(),
    });

    setPlayerId(uid);
    setPlayerName(trimmed);
  }

  /**
   * Rename an existing player (accessible via the edit button in PlayerBanner).
   */
  async function updatePlayerName(name) {
    const trimmed = name.trim();
    if (!trimmed || !playerId) return;

    localStorage.setItem(KEY_NAME, trimmed);

    await setDoc(doc(db, 'players', playerId), { playerName: trimmed }, { merge: true });

    setPlayerName(trimmed);
  }

  return { playerId, playerName, isReady, setupPlayer, updatePlayerName };
}
