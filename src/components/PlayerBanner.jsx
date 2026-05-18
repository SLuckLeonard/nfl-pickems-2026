import { useState } from 'react';
import { usePlayerIdentity } from '../hooks/usePlayerIdentity.js';

export default function PlayerBanner() {
  const { playerId, playerName, isReady, updatePlayerName } = usePlayerIdentity();

  const [mode,      setMode]      = useState('idle'); // 'idle' | 'rename'
  const [draftName, setDraftName] = useState('');
  const [saving,    setSaving]    = useState(false);
  const [copied,    setCopied]    = useState(false);

  // Not ready or no name (shouldn't occur — App gates on playerId first)
  if (!isReady || !playerName) return null;

  function handleCopyId() {
    if (!playerId) return;
    navigator.clipboard.writeText(playerId).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

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
          {saving ? '…' : 'Save'}
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
        onClick={handleCopyId}
        title="Copy your Player ID to link another device"
      >
        {copied ? 'Copied!' : 'Copy ID'}
      </button>
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
