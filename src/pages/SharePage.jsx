import { useEffect, useMemo, useRef, useState } from 'react';
import { SCHEDULE } from '../data/schedule2026.js';
import { TEAMS } from '../data/teams.js';
import { isLocked } from '../data/weekLocks.js';
import { getDivisionStandings, getPlayoffSeeds } from '../engine/bracketEngine.js';
import { usePlayerIdentity } from '../hooks/usePlayerIdentity.js';
import { usePlayers, usePlayerPicks, useSeasonConfig } from '../hooks/useFirestore.js';
import ExportCard from '../components/share/ExportCard.jsx';
import StandingsExport from '../components/share/StandingsExport.jsx';
import BracketExport from '../components/share/BracketExport.jsx';
import TeamScheduleExport from '../components/share/TeamScheduleExport.jsx';
import { downloadCardPng, preloadLogos, slug } from '../lib/exportCard.js';
import '../styles/share.css';

const BRACKET_PICK_THRESHOLD = 100;

// Teams grouped by division for the schedule picker.
const DIVISIONS = [];
for (const conf of ['AFC', 'NFC']) {
  for (const div of ['East', 'North', 'South', 'West']) {
    DIVISIONS.push({
      label: `${conf} ${div}`,
      teams: Object.values(TEAMS)
        .filter((t) => t.conf === conf && t.div === div)
        .sort((a, b) => a.name.localeCompare(b.name)),
    });
  }
}

export default function SharePage() {
  const { playerId, playerName } = usePlayerIdentity();
  const { players } = usePlayers();
  const { config } = useSeasonConfig();

  const otherPlayer = useMemo(
    () => players.find((p) => p.playerId !== playerId) ?? null,
    [players, playerId]
  );

  const { picks: myPre } = usePlayerPicks(playerId, 'preseason');
  const { picks: myBracket } = usePlayerPicks(playerId, 'bracket');
  const { picks: otherPre } = usePlayerPicks(otherPlayer?.playerId ?? null, 'preseason');
  const { picks: otherBracket } = usePlayerPicks(otherPlayer?.playerId ?? null, 'bracket');

  const [tab, setTab] = useState('standings');   // 'standings' | 'bracket' | 'team'
  const [who, setWho] = useState('me');           // 'me' | 'other'
  const [mode, setMode] = useState('conference'); // 'conference' | 'division'
  const [conf, setConf] = useState('AFC');        // 'AFC' | 'NFC'
  const [team, setTeam] = useState('SF');          // teamId for the schedule card
  const [status, setStatus] = useState('idle');   // 'idle' | 'working' | 'done' | 'error'

  const cardRef = useRef(null);

  useEffect(() => { preloadLogos(); }, []);

  const bracketLocked = (config?.bracketLocked ?? false) || isLocked('preseason');
  const otherBracketHidden = !bracketLocked && (config?.bracketHidden ?? true);
  const otherHidden = tab === 'bracket' && otherBracketHidden;

  // Force back to "me" if the opponent view isn't available.
  useEffect(() => {
    if (who === 'other' && (!otherPlayer || otherHidden)) setWho('me');
  }, [who, otherPlayer, otherHidden]);

  const activeName = who === 'me' ? (playerName ?? 'Me') : (otherPlayer?.playerName ?? 'Opponent');
  const picksMap = (who === 'me' ? myPre?.picks : otherPre?.picks) ?? {};
  const bracketPicks = (who === 'me' ? myBracket?.picks : otherBracket?.picks) ?? {};

  const afcSeeds = useMemo(() => {
    const ds = getDivisionStandings(picksMap, SCHEDULE);
    return getPlayoffSeeds(ds, 'AFC', picksMap, SCHEDULE);
  }, [picksMap]);
  const nfcSeeds = useMemo(() => {
    const ds = getDivisionStandings(picksMap, SCHEDULE);
    return getPlayoffSeeds(ds, 'NFC', picksMap, SCHEDULE);
  }, [picksMap]);

  const pickCount = Object.keys(picksMap).length;
  const bracketReady = pickCount >= BRACKET_PICK_THRESHOLD;
  const canExport = tab === 'bracket' ? bracketReady : pickCount > 0;

  async function handleDownload() {
    if (!cardRef.current) return;
    setStatus('working');
    try {
      const parts =
        tab === 'standings' ? ['pickems', conf.toLowerCase(), mode, slug(activeName)]
        : tab === 'bracket' ? ['pickems', 'bracket', slug(activeName)]
        : ['pickems', slug(team), 'schedule', slug(activeName)];
      await downloadCardPng(cardRef.current, parts.join('-'));
      setStatus('done');
      setTimeout(() => setStatus('idle'), 2500);
    } catch (e) {
      console.error('[share] export failed:', e);
      setStatus('error');
    }
  }

  const cardTitle =
    tab === 'standings' ? `${conf} Predicted Standings`
    : tab === 'bracket' ? 'Predicted Playoff Bracket'
    : `${TEAMS[team]?.name ?? team} — Predicted Schedule`;
  const cardSubtitle = `${activeName}'s picks`;
  const cardWidth =
    tab === 'bracket' ? 640
    : tab === 'team' ? 480
    : mode === 'division' ? 470 : 540;

  const emptyMessage =
    tab === 'bracket' && !bracketReady
      ? who === 'other'
        ? `${activeName} hasn't made enough picks for a bracket yet.`
        : `Make at least ${BRACKET_PICK_THRESHOLD} pre-season picks to generate a bracket (${pickCount} so far).`
      : pickCount === 0
        ? who === 'other'
          ? `${activeName} hasn't made any pre-season picks yet.`
          : 'Make some pre-season picks first — these cards are derived from them.'
        : null;

  return (
    <div className="page share-page">
      <h1>Share</h1>
      <p className="text-muted">
        Build a shareable image of your predicted standings, a team&apos;s season, or the
        playoff bracket, then download it as a PNG.
      </p>

      {/* ── Controls ── */}
      <div className="share-controls">
        <div className="share-control-group">
          <span className="share-control-label">Card</span>
          <div className="share-seg">
            <button className={tab === 'standings' ? 'is-active' : ''} onClick={() => setTab('standings')}>
              Standings
            </button>
            <button className={tab === 'team' ? 'is-active' : ''} onClick={() => setTab('team')}>
              Team Schedule
            </button>
            <button className={tab === 'bracket' ? 'is-active' : ''} onClick={() => setTab('bracket')}>
              Bracket
            </button>
          </div>
        </div>

        {otherPlayer && (
          <div className="share-control-group">
            <span className="share-control-label">Whose picks</span>
            <div className="share-seg">
              <button className={who === 'me' ? 'is-active' : ''} onClick={() => setWho('me')}>
                {playerName ?? 'Me'}
              </button>
              <button
                className={who === 'other' ? 'is-active' : ''}
                onClick={() => setWho('other')}
                disabled={otherHidden}
                title={otherHidden ? 'Hidden until the bracket locks' : undefined}
              >
                {otherPlayer.playerName}
              </button>
            </div>
          </div>
        )}

        {tab === 'team' && (
          <div className="share-control-group">
            <span className="share-control-label">Team</span>
            <select
              className="share-select"
              value={team}
              onChange={(e) => setTeam(e.target.value)}
            >
              {DIVISIONS.map((d) => (
                <optgroup key={d.label} label={d.label}>
                  {d.teams.map((t) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>
        )}

        {tab === 'standings' && (
          <>
            <div className="share-control-group">
              <span className="share-control-label">Group by</span>
              <div className="share-seg">
                <button className={mode === 'conference' ? 'is-active' : ''} onClick={() => setMode('conference')}>
                  Conference
                </button>
                <button className={mode === 'division' ? 'is-active' : ''} onClick={() => setMode('division')}>
                  Division
                </button>
              </div>
            </div>
            <div className="share-control-group">
              <span className="share-control-label">Conference</span>
              <div className="share-seg">
                <button className={conf === 'AFC' ? 'is-active' : ''} onClick={() => setConf('AFC')}>AFC</button>
                <button className={conf === 'NFC' ? 'is-active' : ''} onClick={() => setConf('NFC')}>NFC</button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* ── Download ── */}
      <div className="share-actions">
        <button
          className="btn btn--primary"
          onClick={handleDownload}
          disabled={status === 'working' || !canExport}
        >
          {status === 'working' ? 'Rendering…' : 'Download PNG'}
        </button>
        {status === 'done' && <span className="share-status share-status--ok">Saved ✓</span>}
        {status === 'error' && <span className="share-status share-status--err">Export failed — try again</span>}
        <span className="text-muted share-hint">On iPhone the image may open in a new tab — long-press to save it.</span>
      </div>

      {/* ── Preview ── */}
      <div className="share-preview">
        {emptyMessage ? (
          <div className="share-empty">{emptyMessage}</div>
        ) : (
          <ExportCard ref={cardRef} title={cardTitle} subtitle={cardSubtitle} width={cardWidth}>
            {tab === 'standings' && (
              <StandingsExport picksMap={picksMap} schedule={SCHEDULE} mode={mode} conference={conf} />
            )}
            {tab === 'team' && (
              <TeamScheduleExport teamId={team} picksMap={picksMap} schedule={SCHEDULE} />
            )}
            {tab === 'bracket' && (
              <BracketExport afcSeeds={afcSeeds} nfcSeeds={nfcSeeds} bracketPicks={bracketPicks} />
            )}
          </ExportCard>
        )}
      </div>
    </div>
  );
}
