import { useState } from 'react';

export default function SetupScreen({ onSetup, onLink }) {
  const [mode,    setMode]    = useState('setup'); // 'setup' | 'link'
  const [value,   setValue]   = useState('');
  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState('');

  function switchMode(next) {
    setMode(next);
    setValue('');
    setError('');
  }

  async function handleSetup(e) {
    e.preventDefault();
    const trimmed = value.trim();
    if (!trimmed) return;
    setSaving(true);
    await onSetup(trimmed);
    // App re-renders once playerId is set — no need to reset saving
  }

  async function handleLink(e) {
    e.preventDefault();
    const trimmed = value.trim();
    if (!trimmed) return;
    setSaving(true);
    setError('');
    const result = await onLink(trimmed);
    if (!result.success) {
      setError(result.error);
      setSaving(false);
    }
    // On success App re-renders, no need to reset
  }

  const isLink = mode === 'link';

  return (
    <div className="setup-screen">
      <div className="setup-screen__card">
        <div className="setup-screen__header">
          <div className="setup-screen__logo">NFL Pick'em 2026</div>
          <p className="setup-screen__sub">Two-player season tracker</p>
        </div>

        {isLink ? (
          <form className="setup-screen__form" onSubmit={handleLink}>
            <label className="setup-screen__label" htmlFor="setup-link">
              Enter your Player ID
            </label>
            <p className="setup-screen__hint">
              Find your ID on the other device: look for the "Copy ID" button next to your name.
            </p>
            <input
              id="setup-link"
              className="setup-screen__input"
              placeholder="Paste Player ID here"
              value={value}
              onChange={e => { setValue(e.target.value); setError(''); }}
              autoFocus
              disabled={saving}
            />
            {error && <p className="setup-screen__error">{error}</p>}
            <button
              className="btn btn--primary btn--lg"
              type="submit"
              disabled={saving || !value.trim()}
            >
              {saving ? 'Linking…' : 'Link Device'}
            </button>
            <button
              className="setup-screen__switch"
              type="button"
              onClick={() => switchMode('setup')}
            >
              ← Back to new account
            </button>
          </form>
        ) : (
          <form className="setup-screen__form" onSubmit={handleSetup}>
            <label className="setup-screen__label" htmlFor="setup-name">
              What's your name?
            </label>
            <input
              id="setup-name"
              className="setup-screen__input"
              placeholder="Enter your name"
              value={value}
              onChange={e => setValue(e.target.value)}
              maxLength={30}
              autoFocus
              disabled={saving}
            />
            <button
              className="btn btn--primary btn--lg"
              type="submit"
              disabled={saving || !value.trim()}
            >
              {saving ? 'Setting up…' : "Let's Go"}
            </button>
            <button
              className="setup-screen__switch"
              type="button"
              onClick={() => switchMode('link')}
            >
              Already have an account? Enter your Player ID →
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
