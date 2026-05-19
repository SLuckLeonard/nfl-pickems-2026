import { useState, useEffect, useRef } from 'react';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../firebase/config.js';
import { SCHEDULE } from '../data/schedule2026.js';
import { isLocked } from '../data/weekLocks.js';
import { usePlayerPicks, useResults, useSeasonConfig, usePlayers } from '../hooks/useFirestore.js';
import { usePlayerIdentity } from '../hooks/usePlayerIdentity.js';
import GameCard from '../components/GameCard.jsx';
import LockBanner from '../components/LockBanner.jsx';
import StandingsPanel from '../components/StandingsPanel.jsx';
import BracketPanel from '../components/BracketPanel.jsx';
import '../styles/picksheet.css';
import '../styles/standings.css';

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
  const { players } = usePlayers();

  // Other player's picks for bracket comparison
  const otherPlayer = players.find(p => p.playerId !== playerId) ?? null;
  const { picks: otherSavedPicks } = usePlayerPicks(otherPlayer?.playerId ?? null, 'preseason');
  const otherPicksMap = otherSavedPicks?.picks ?? {};

  const { picks: savedBracketPicks, loading: loadingBracket } = usePlayerPicks(playerId, 'bracket');
  const { picks: otherSavedBracketPicks } = usePlayerPicks(otherPlayer?.playerId ?? null, 'bracket');

  const [localPicks,        setLocalPicks]        = useState({});
  const [localBracketPicks, setLocalBracketPicks] = useState({});
  const [openWeeks,         setOpenWeeks]         = useState(() => new Set([1]));
  const [saveStatus,        setSaveStatus]        = useState('idle'); // 'idle'|'saving'|'saved'|'error'
  const [rightTab,          setRightTab]          = useState('standings'); // 'standings'|'bracket'
  const initialized        = useRef(false);
  const bracketInitialized = useRef(false);

  // Initialize from Firestore exactly once (avoid overwriting in-progress edits)
  useEffect(() => {
    if (!loading && !initialized.current) {
      initialized.current = true;
      if (savedPicks?.picks) setLocalPicks(savedPicks.picks);
    }
  }, [loading, savedPicks]);

  useEffect(() => {
    if (!loadingBracket && !bracketInitialized.current) {
      bracketInitialized.current = true;
      if (savedBracketPicks?.picks) setLocalBracketPicks(savedBracketPicks.picks);
    }
  }, [loadingBracket, savedBracketPicks]);

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

  async function handleBracketPicksChange(sanitizedPicks) {
    setLocalBracketPicks(sanitizedPicks);
    if (!playerId) return;
    try {
      await setDoc(
        doc(db, 'picks', `${playerId}_bracket`),
        { playerId, playerName, type: 'bracket', picks: sanitizedPicks, submittedAt: new Date().toISOString() },
        { merge: true }
      );
    } catch {
      // local state updated; silent save failure
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

      <div className="preseason-layout">
        {/* ── Left: pick sheet accordion ── */}
        <div>
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

        {/* ── Right: live standings + bracket panel ── */}
        <aside className="preseason-layout__panel">
          <div className="side-panel">
            <div className="panel-tabs">
              <button
                className={`panel-tab ${rightTab === 'standings' ? 'panel-tab--active' : ''}`}
                onClick={() => setRightTab('standings')}
              >
                Standings
              </button>
              <button
                className={`panel-tab ${rightTab === 'bracket' ? 'panel-tab--active' : ''}`}
                onClick={() => setRightTab('bracket')}
              >
                Bracket
              </button>
            </div>

            <div className="panel-scroll">
              {rightTab === 'standings' ? (
                <StandingsPanel
                  localPicks={localPicks}
                  schedule={SCHEDULE}
                  results={results}
                />
              ) : (
                <BracketPanel
                  localPicks={localPicks}
                  bracketPicks={localBracketPicks}
                  onBracketPicksChange={handleBracketPicksChange}
                  playerName={playerName}
                  otherPicksMap={otherPicksMap}
                  otherPlayerName={otherPlayer?.playerName ?? null}
                  otherBracketPicks={otherSavedBracketPicks?.picks ?? {}}
                  bracketLocked={config?.bracketLocked ?? false}
                  bracketHidden={config?.bracketHidden ?? true}
                  schedule={SCHEDULE}
                />
              )}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
