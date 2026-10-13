import { usePlayerIdentity } from './usePlayerIdentity.js';

// Admin match: any UID in VITE_ADMIN_PLAYER_ID (comma-separated ok), or a
// case-insensitive name match on VITE_ADMIN_NAME. The name fallback survives a
// season reset, where the anonymous auth UID can rotate.
const ADMIN_IDS = (import.meta.env.VITE_ADMIN_PLAYER_ID ?? '')
  .split(',').map(s => s.trim()).filter(Boolean);
const ADMIN_NAME = (import.meta.env.VITE_ADMIN_NAME ?? '').trim().toLowerCase();

/** @returns {boolean} whether the current player is the designated admin. */
export function useIsAdmin() {
  const { playerId, playerName } = usePlayerIdentity();
  return (
    (!!playerId && ADMIN_IDS.includes(playerId)) ||
    (!!ADMIN_NAME && (playerName ?? '').trim().toLowerCase() === ADMIN_NAME)
  );
}
