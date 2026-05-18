import { useState, useEffect, useRef } from 'react';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../firebase/config.js';
import { SCHEDULE } from '../data/schedule2026.js';
import { isLocked } from '../data/weekLocks.js';
import { usePlayerPicks, useResults, useSeasonConfig } from '../hooks/useFirestore.js';
import { usePlayerIdentity } from '../hooks/usePlayerIdentity.js';
import GameCard from '../components/GameCard.jsx';
import LockBanner from '../components/LockBanner.jsx';
import '../styles/picksheet.css';

// Static grouping — SCHEDULE never changes at runtime
const WEEKS_IN_SCHEDULE = [...new Set(SCHEDULE.map(g => g.week))].sort((a, b) => a - b);
const GAMES_BY_WEEK = WEEKS_IN_SCHEDULE.reduce((acc, week) => {
  acc[week] = SCHEDULE.filter(g => g.week === week);
  return acc;
}, {});
const TOTAL_GAMES = SCHEDULE.length;

export default function PreSeasonPickSheet() {
  const { playerId, playerName } = usePlayerIdentity();
  const { picks: savedPicks, loading } = usePlayerPicks(playerId, 'preseason');
  const { results } = useResults();
  const { config  } = useSeasonConfig();

  const [localPicks, setLocalPicks] = useState({});
  const [openWeeks, setOpenWeeks]   = useState(() => new Set([1]));
  const [saveStatus, setSaveStatus] = useState('idle'); // 'idle'|'saving'|'saved'|'error'
  const initialized = useRef(false);

  // Initialize from Firestore exactly once (avoid overwriting in-progress edits)
  useEffect(() => {
    if (!loading && !initialized.current) {
      initialized.current = true;
      if (savedPicks?.picks) setLocalPicks(savedPicks.picks);
    }
  }, [loading, savedPicks]);

  // Locked if: hardcoded deadline passed, admin manually locked it, or player submitted
  const systemLocked    = isLocked('preseason') || (config?.locked ?? false);
  const submittedLocked = savedPicks?.locked === true;
  const locked          = systemLocked || submittedLocked;

  const pickedCount = Object.keys(localPicks).length;
  const allPicked   = pickedCount >= TOTAL_GAMES;

  function handlePick(gameId, teamId) {
    if (locked) return;
    setLocalPicks(prev => ({ ...prev, [gameId]: teamId }));
    setSaveStatus('idle');
  }

  async function savePicks(extraFields = {}) {
    if (!playerId) return;
    setSaveStatus('saving');
    try {
      await setDoc(
        doc(db, 'picks', `${playerId}_preseason`),
        {
          playerId,
          playerName,
          type: 'preseason',
          picks: localPicks,
          submittedAt: new Date().toISOString(),
          ...extraFields,
        },
        { merge: true }
      );
      setSaveStatus('saved');
    } catch {
      setSaveStatus('error');
    }
  }

  function toggleWeek(week) {
    setOpenWeeks(prev => {
      const next = new Set(prev);
      if (next.has(week)) next.delete(week); else next.add(week);
      return next;
    });
  }

  if (loading) {
    return <div className="page"><p className="placeholder-note">Loading picks…</p></div>;
  }

  return (
    <div className="page">
      <h1>Pre-Season Pick Sheet</h1>

      {locked && <LockBanner type="preseason" />}

      {!locked && (
        <div className="picksheet-toolbar">
          <div className="picksheet-progress">
            <div className="picksheet-progress__bar">
              <div
                className="picksheet-progress__fill"
                style={{ width: `${TOTAL_GAMES > 0 ? (pickedCount / TOTAL_GAMES) * 100 : 0}%` }}
              />
            </div>
            <span className="picksheet-progress__label">
              {pickedCount} / {TOTAL_GAMES} picked
            </span>
          </div>
          <div className="picksheet-toolbar__actions">
            {saveStatus === 'saving' && <span className="picksheet-autosave">Saving…</span>}
            {saveStatus === 'saved'  && <span className="picksheet-autosave picksheet-autosave--ok">Saved ✓</span>}
            {saveStatus === 'error'  && <span className="picksheet-autosave picksheet-autosave--err">Error saving</span>}
            <button
              className="btn btn--ghost btn--sm"
              onClick={() => savePicks()}
              disabled={saveStatus === 'saving' || !playerId}
            >
              Save Picks
            </button>
            {allPicked && (
              <button
                className="btn btn--primary"
                onClick={() => savePicks({ locked: true })}
                disabled={saveStatus === 'saving' || !playerId}
              >
                Submit &amp; Lock
              </button>
            )}
          </div>
        </div>
      )}

      <div className="picksheet-accordion">
        {WEEKS_IN_SCHEDULE.map(week => {
          const games      = GAMES_BY_WEEK[week] ?? [];
          const weekPicked = games.filter(g => localPicks[g.gameId]).length;
          const isOpen     = openWeeks.has(week);

          return (
            <section
              key={week}
              className={`picksheet-week${isOpen ? ' picksheet-week--open' : ''}`}
            >
              <button
                className="picksheet-week__header"
                onClick={() => toggleWeek(week)}
                aria-expanded={isOpen}
              >
                <span className="picksheet-week__title">Week {week}</span>
                <span className="picksheet-week__count">{weekPicked} / {games.length}</span>
                <span className="picksheet-week__chevron" aria-hidden="true" />
              </button>

              {isOpen && (
                <div className="picksheet-week__body">
                  <div className="game-grid">
                    {games.map(game => (
                      <GameCard
                        key={game.gameId}
                        game={game}
                        picked={localPicks[game.gameId] ?? null}
                        result={results?.games?.[game.gameId] ?? null}
                        locked={locked}
                        onPick={teamId => handlePick(game.gameId, teamId)}
                      />
                    ))}
                  </div>
                </div>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}
