import { useState } from 'react';
import { usePlayerIdentity } from '../hooks/usePlayerIdentity.js';

/**
 * Displays the current player's name in the nav bar.
 *
 * States:
 *   not ready yet          → renders nothing (avoids flash)
 *   ready, no name set     → inline "Set your name" form (temp until Phase 6 full setup screen)
 *   ready, name set        → player name + Rename button with inline edit form
 */
export default function PlayerBanner() {
  const { playerName, isReady, setupPlayer, updatePlayerName } = usePlayerIdentity();

  const [mode,      setMode]      = useState('idle'); // 'idle' | 'setup' | 'rename'
  const [draftName, setDraftName] = useState('');
  const [saving,    setSaving]    = useState(false);

  // Don't render anything until localStorage has been checked (avoids name flash)
  if (!isReady) return null;

  // ── First-visit: no name stored yet ───────────────────────────────────────
  if (!playerName) {
    if (mode !== 'setup') {
      return (
        <button className="btn btn--ghost btn--sm" onClick={() => { setDraftName(''); setMode('setup'); }}>
          Set your name
        </button>
      );
    }

    return (
      <form
        className="player-banner player-banner--editing"
        onSubmit={async e => {
          e.preventDefault();
          const trimmed = draftName.trim();
          if (!trimmed) return;
          setSaving(true);
          await setupPlayer(trimmed);
          setSaving(false);
          setMode('idle');
        }}
      >
        <input
          className="player-banner__input"
          placeholder="Your name"
          value={draftName}
          onChange={e => setDraftName(e.target.value)}
          onKeyDown={e => e.key === 'Escape' && setMode('idle')}
          maxLength={30}
          autoFocus
        />
        <button className="btn btn--primary btn--sm" type="submit" disabled={saving || !draftName.trim()}>
          {saving ? '...' : 'Save'}
        </button>
        <button className="btn btn--ghost btn--sm" type="button" onClick={() => setMode('idle')}>
          Cancel
        </button>
      </form>
    );
  }

  // ── Returning player: show name + rename ──────────────────────────────────
  if (mode === 'rename') {
    return (
      <form
        className="player-banner player-banner--editing"
        onSubmit={async e => {
          e.preventDefault();
          const trimmed = draftName.trim();
          if (!trimmed || trimmed === playerName) { setMode('idle'); return; }
          setSaving(true);
          await updatePlayerName(trimmed);
          setSaving(false);
          setMode('idle');
        }}
      >
        <input
          className="player-banner__input"
          value={draftName}
          onChange={e => setDraftName(e.target.value)}
          onKeyDown={e => e.key === 'Escape' && setMode('idle')}
          maxLength={30}
          autoFocus
        />
        <button className="btn btn--primary btn--sm" type="submit" disabled={saving}>
          {saving ? '...' : 'Save'}
        </button>
        <button className="btn btn--ghost btn--sm" type="button" onClick={() => setMode('idle')}>
          Cancel
        </button>
      </form>
    );
  }

  return (
    <div className="player-banner">
      <span className="player-banner__name" title={playerName}>{playerName}</span>
      <button
        className="btn btn--ghost btn--sm"
        onClick={() => { setDraftName(playerName); setMode('rename'); }}
        title="Rename player"
      >
        Rename
      </button>
    </div>
  );
}
