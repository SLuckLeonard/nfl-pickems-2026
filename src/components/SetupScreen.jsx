import { useState } from 'react';

export default function SetupScreen({ onSetup }) {
  const [name,   setName]   = useState('');
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    setSaving(true);
    await onSetup(trimmed);
    // App re-renders once playerId is set — no need to reset saving
  }

  return (
    <div className="setup-screen">
      <div className="setup-screen__card">
        <div className="setup-screen__header">
          <div className="setup-screen__logo">NFL Pick'em 2026</div>
          <p className="setup-screen__sub">Two-player season tracker</p>
        </div>

        <form className="setup-screen__form" onSubmit={handleSubmit}>
          <label className="setup-screen__label" htmlFor="setup-name">
            What's your name?
          </label>
          <input
            id="setup-name"
            className="setup-screen__input"
            placeholder="Enter your name"
            value={name}
            onChange={e => setName(e.target.value)}
            maxLength={30}
            autoFocus
            disabled={saving}
          />
          <button
            className="btn btn--primary btn--lg"
            type="submit"
            disabled={saving || !name.trim()}
          >
            {saving ? 'Setting up…' : "Let's Go"}
          </button>
        </form>
      </div>
    </div>
  );
}
