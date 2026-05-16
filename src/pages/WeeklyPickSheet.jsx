import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../firebase/config.js';
import { SCHEDULE } from '../data/schedule2026.js';
import { isLocked } from '../data/weekLocks.js';
import { usePlayerPicks, useResults } from '../hooks/useFirestore.js';
import { usePlayerIdentity } from '../hooks/usePlayerIdentity.js';
import GameCard from '../components/GameCard.jsx';
import LockBanner from '../components/LockBanner.jsx';
import WeekNav from '../components/WeekNav.jsx';
import '../styles/picksheet.css';

export default function WeeklyPickSheet() {
  const { weekNumber } = useParams();
  const week     = Number(weekNumber) || 1;
  const navigate = useNavigate();

  const { playerId, playerName } = usePlayerIdentity();
  const { picks: savedPicks }    = usePlayerPicks(playerId, `week_${week}`);
  const { results }              = useResults();

  const [localPicks, setLocalPicks] = useState({});
  const [saveStatus, setSaveStatus] = useState('idle');

  const weekGames = SCHEDULE.filter(g => g.week === week);
  const locked    = isLocked(week);

  // Sync localPicks from Firestore when week changes or savedPicks arrives.
  // The type check prevents loading a different week's stale data.
  useEffect(() => {
    const isForThisWeek = savedPicks?.type === `week_${week}`;
    setLocalPicks(isForThisWeek ? (savedPicks.picks ?? {}) : {});
    setSaveStatus('idle');
  }, [week, savedPicks]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handlePick(gameId, teamId) {
    if (locked || !playerId) return;
    const next = { ...localPicks, [gameId]: teamId };
    setLocalPicks(next);
    setSaveStatus('saving');
    try {
      await setDoc(
        doc(db, 'picks', `${playerId}_week_${week}`),
        {
          playerId,
          playerName,
          type: `week_${week}`,
          picks: next,
          submittedAt: new Date().toISOString(),
        },
        { merge: true }
      );
      setSaveStatus('saved');
    } catch {
      setSaveStatus('error');
    }
  }

  const pickedCount = weekGames.filter(g => localPicks[g.gameId]).length;

  return (
    <div className="page">
      <WeekNav week={week} onChange={w => navigate(`/week/${w}`)} />

      {locked && <LockBanner type="week" />}

      {!locked && weekGames.length > 0 && (
        <div className="picksheet-toolbar">
          <div className="picksheet-progress">
            <div className="picksheet-progress__bar">
              <div
                className="picksheet-progress__fill"
                style={{ width: `${weekGames.length > 0 ? (pickedCount / weekGames.length) * 100 : 0}%` }}
              />
            </div>
            <span className="picksheet-progress__label">
              {pickedCount} / {weekGames.length} picked
            </span>
          </div>
          <div className="picksheet-toolbar__actions">
            {saveStatus === 'saving' && <span className="picksheet-autosave">Saving…</span>}
            {saveStatus === 'saved'  && <span className="picksheet-autosave picksheet-autosave--ok">Saved ✓</span>}
            {saveStatus === 'error'  && <span className="picksheet-autosave picksheet-autosave--err">Error saving</span>}
          </div>
        </div>
      )}

      {weekGames.length === 0 ? (
        <p className="placeholder-note">
          No games scheduled for Week {week} yet. Check back when the schedule is available.
        </p>
      ) : (
        <div className="game-grid">
          {weekGames.map(game => (
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
      )}
    </div>
  );
}
