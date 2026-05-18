import { useState, useEffect, useRef } from 'react';
import { doc, setDoc, getDocs, deleteDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase/config.js';
import { SCHEDULE } from '../data/schedule2026.js';
import { TEAMS } from '../data/teams.js';
import { useResults, useSeasonConfig } from '../hooks/useFirestore.js';
import { useCurrentWeek } from '../hooks/useCurrentWeek.js';
import { usePlayerIdentity } from '../hooks/usePlayerIdentity.js';
import WeekNav from '../components/WeekNav.jsx';

// Division groupings for the O/U editor
const DIVISIONS = [
  { conf: 'AFC', div: 'East',  teams: ['BUF', 'MIA', 'NE',  'NYJ'] },
  { conf: 'AFC', div: 'North', teams: ['BAL', 'CIN', 'CLE', 'PIT'] },
  { conf: 'AFC', div: 'South', teams: ['HOU', 'IND', 'JAX', 'TEN'] },
  { conf: 'AFC', div: 'West',  teams: ['DEN', 'KC',  'LV',  'LAC'] },
  { conf: 'NFC', div: 'East',  teams: ['DAL', 'NYG', 'PHI', 'WAS'] },
  { conf: 'NFC', div: 'North', teams: ['CHI', 'DET', 'GB',  'MIN'] },
  { conf: 'NFC', div: 'South', teams: ['ATL', 'CAR', 'NO',  'TB']  },
  { conf: 'NFC', div: 'West',  teams: ['ARI', 'LAR', 'SF',  'SEA'] },
];

export default function ResultsEntry() {
  const { playerId }             = usePlayerIdentity();
  const isAdmin                  = playerId === import.meta.env.VITE_ADMIN_PLAYER_ID;
  const currentWeek              = useCurrentWeek();
  const { results, loading: resultsLoading } = useResults();
  const { config,  loading: configLoading  } = useSeasonConfig();

  const [week,          setWeek]          = useState(currentWeek);
  const [localResults,  setLocalResults]  = useState({});
  const [localOuLines,  setLocalOuLines]  = useState({});
  const [saveStatus,    setSaveStatus]    = useState('idle'); // 'idle'|'saving'|'saved'|'error'
  const [ouSaveStatus,  setOuSaveStatus]  = useState('idle');
  const [resetConfirm,  setResetConfirm]  = useState(false);
  const [resetting,     setResetting]     = useState(false);

  const resultsInit = useRef(false);
  const ouInit      = useRef(false);

  // Initialise local state from Firestore exactly once each
  useEffect(() => {
    if (!resultsLoading && !resultsInit.current) {
      resultsInit.current = true;
      setLocalResults(results?.games ?? {});
    }
  }, [resultsLoading, results]);

  useEffect(() => {
    if (!configLoading && !ouInit.current) {
      ouInit.current = true;
      setLocalOuLines(config?.ouLines ?? {});
    }
  }, [configLoading, config]);

  // ── Helpers ──────────────────────────────────────────────────────────────

  function toggleWinner(gameId, teamId) {
    setLocalResults(prev => {
      const next = { ...prev };
      if (next[gameId] === teamId) delete next[gameId]; // deselect
      else next[gameId] = teamId;
      return next;
    });
    setSaveStatus('idle');
  }

  async function saveResults() {
    setSaveStatus('saving');
    try {
      // Build a clean copy — filters out any null/undefined entries that
      // Firestore would reject, and avoids passing the live state reference.
      const games = Object.fromEntries(
        Object.entries(localResults).filter(([, v]) => v != null)
      );
      console.log('[Results] writing to Firestore:', games);
      await setDoc(doc(db, 'results', '2026'), {
        games,
        lastUpdated: serverTimestamp(),
      });
      setSaveStatus('saved');
    } catch (e) {
      console.error('[Results] Firestore write failed:', e);
      setSaveStatus('error');
    }
  }

  async function saveOuLines() {
    setOuSaveStatus('saving');
    try {
      await setDoc(doc(db, 'season', '2026'), {
        ouLines: localOuLines,
      }, { merge: true });
      setOuSaveStatus('saved');
    } catch {
      setOuSaveStatus('error');
    }
  }

  async function togglePreseasonLock() {
    const current = config?.locked ?? false;
    await setDoc(doc(db, 'season', '2026'), { locked: !current }, { merge: true });
  }

  async function toggleWeekLock(w) {
    const currentLocks = config?.weekLocks ?? {};
    const current      = currentLocks[w] ?? false;
    await setDoc(doc(db, 'season', '2026'), {
      weekLocks: { ...currentLocks, [w]: !current },
    }, { merge: true });
  }

  async function handleReset() {
    setResetting(true);
    try {
      const snap = await getDocs(collection(db, 'picks'));
      await Promise.all(snap.docs.map(d => deleteDoc(doc(db, 'picks', d.id))));
      setResetConfirm(false);
    } catch {
      // leave dialog open so user can retry
    } finally {
      setResetting(false);
    }
  }

  // ── Derived ───────────────────────────────────────────────────────────────

  const weekGames     = SCHEDULE.filter(g => g.week === week);
  const weekResultsCount = weekGames.filter(g => localResults[g.gameId]).length;

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="page">
      <h1>Results Entry</h1>

      {/* ── Section 1: Game Results ── */}
      <section className="results-section">
        <h2>Game Results</h2>

        <WeekNav week={week} onChange={setWeek} />

        <div className="results-toolbar">
          <span className="text-muted" style={{ fontSize: 13 }}>
            {weekResultsCount} / {weekGames.length} entered for Week {week}
          </span>
          {isAdmin && (
            <div className="results-toolbar__actions">
              {saveStatus === 'saving' && <span className="picksheet-autosave">Saving…</span>}
              {saveStatus === 'saved'  && <span className="picksheet-autosave picksheet-autosave--ok">Saved ✓</span>}
              {saveStatus === 'error'  && <span className="picksheet-autosave picksheet-autosave--err">Error</span>}
              <button
                className="btn btn--primary btn--sm"
                onClick={saveResults}
                disabled={saveStatus === 'saving'}
              >
                Save Results
              </button>
            </div>
          )}
        </div>

        {weekGames.length === 0 ? (
          <p className="placeholder-note">No games scheduled for Week {week} yet.</p>
        ) : (
          <div className="result-games-list">
            {weekGames.map(game => {
              const winner = localResults[game.gameId];
              const away   = TEAMS[game.awayTeam];
              const home   = TEAMS[game.homeTeam];
              return (
                <div key={game.gameId} className="result-game">
                  <button
                    className={`result-team-btn${winner === game.awayTeam ? ' result-team-btn--selected' : ''}`}
                    onClick={() => toggleWinner(game.gameId, game.awayTeam)}
                    disabled={!isAdmin}
                  >
                    <span className="result-team-btn__abbr">{away?.abbr ?? game.awayTeam}</span>
                    <span className="result-team-btn__name">{away?.name ?? game.awayTeam}</span>
                  </button>
                  <span className="result-game__at">@</span>
                  <button
                    className={`result-team-btn${winner === game.homeTeam ? ' result-team-btn--selected' : ''}`}
                    onClick={() => toggleWinner(game.gameId, game.homeTeam)}
                    disabled={!isAdmin}
                  >
                    <span className="result-team-btn__abbr">{home?.abbr ?? game.homeTeam}</span>
                    <span className="result-team-btn__name">{home?.name ?? game.homeTeam}</span>
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ── Section 2: O/U Lines (visible to all, editable by admin only) ── */}
      <section className="results-section">
        <h2>Over/Under Lines</h2>
        <p className="text-muted" style={{ fontSize: 13, marginBottom: 'var(--space-md)' }}>
          Set each team's season win total O/U line. Values like 9.5, 11.0 are typical.
        </p>

        <div className="ou-editor">
          {DIVISIONS.map(({ conf, div, teams }) => (
            <div key={`${conf}-${div}`} className="ou-division">
              <div className="ou-division__title">{conf} {div}</div>
              {teams.map(teamId => (
                <div key={teamId} className="ou-team-row">
                  <span className="ou-team-row__abbr">{TEAMS[teamId]?.abbr ?? teamId}</span>
                  <input
                    className="ou-team-row__input"
                    type="number"
                    step="0.5"
                    min="0"
                    max="17"
                    placeholder="—"
                    value={localOuLines[teamId] ?? ''}
                    disabled={!isAdmin}
                    onChange={e => {
                      const val = e.target.value === '' ? null : parseFloat(e.target.value);
                      setLocalOuLines(prev => ({ ...prev, [teamId]: val }));
                      setOuSaveStatus('idle');
                    }}
                  />
                </div>
              ))}
            </div>
          ))}
        </div>

        {isAdmin && (
          <div className="results-toolbar" style={{ marginTop: 'var(--space-md)' }}>
            <div />
            <div className="results-toolbar__actions">
              {ouSaveStatus === 'saving' && <span className="picksheet-autosave">Saving…</span>}
              {ouSaveStatus === 'saved'  && <span className="picksheet-autosave picksheet-autosave--ok">Saved ✓</span>}
              {ouSaveStatus === 'error'  && <span className="picksheet-autosave picksheet-autosave--err">Error</span>}
              <button
                className="btn btn--primary btn--sm"
                onClick={saveOuLines}
                disabled={ouSaveStatus === 'saving'}
              >
                Save O/U Lines
              </button>
            </div>
          </div>
        )}
      </section>

      {/* ── Section 3: Admin Controls (admin only) ── */}
      {isAdmin && <section className="results-section">
        <h2>Admin Controls</h2>

        <div className="admin-section">
          {/* Lock Controls */}
          <div className="admin-group">
            <h3>Lock Controls</h3>

            <div className="lock-toggle-row">
              <span>Pre-Season Picks</span>
              <button
                className={`btn btn--sm ${config?.locked ? 'btn--danger' : 'btn--ghost'}`}
                onClick={togglePreseasonLock}
              >
                {config?.locked ? 'LOCKED — click to unlock' : 'OPEN — click to lock'}
              </button>
            </div>

            <div className="lock-grid">
              {Array.from({ length: 18 }, (_, i) => i + 1).map(w => {
                const isLocked = config?.weekLocks?.[w] ?? false;
                return (
                  <div key={w} className="lock-week">
                    <span className="lock-week__label">Wk {w}</span>
                    <button
                      className={`lock-week__btn ${isLocked ? 'lock-week__btn--locked' : 'lock-week__btn--open'}`}
                      onClick={() => toggleWeekLock(w)}
                      title={`Week ${w}: click to ${isLocked ? 'unlock' : 'lock'}`}
                    >
                      {isLocked ? 'LOCK' : 'OPEN'}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Danger Zone */}
          <div className="admin-group admin-group--danger">
            <h3>Danger Zone</h3>
            {resetConfirm ? (
              <div className="confirm-dialog">
                <p>
                  This will delete every document in the <strong>picks</strong> collection from
                  Firestore. Game results and O/U lines are not affected. This cannot be undone.
                </p>
                <div className="confirm-dialog__actions">
                  <button
                    className="btn btn--danger"
                    onClick={handleReset}
                    disabled={resetting}
                  >
                    {resetting ? 'Deleting…' : 'Yes, delete all picks'}
                  </button>
                  <button
                    className="btn btn--ghost btn--sm"
                    onClick={() => setResetConfirm(false)}
                    disabled={resetting}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button className="btn btn--danger" onClick={() => setResetConfirm(true)}>
                Reset All Picks
              </button>
            )}
          </div>
        </div>
      </section>}
    </div>
  );
}
