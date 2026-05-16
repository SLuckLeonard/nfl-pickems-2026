import { TEAMS } from '../data/teams.js';

/**
 * Single game pick card. Used in both PreSeasonPickSheet and WeeklyPickSheet.
 *
 * Visual states per team button (evaluated after results are in):
 *   correct  — this team won AND the player picked them  → green
 *   wrong    — this team lost AND the player picked them → red + strikethrough
 *   result   — this team won but player didn't pick them → green (dimmer)
 *   selected — player picked this team, no result yet   → accent blue
 *   default  — no pick, no result                       → muted
 *
 * @param {{ game: Object, picked: string|null, result: string|null,
 *            locked: boolean, onPick: (teamId: string) => void }} props
 */
export default function GameCard({ game, picked, result, locked, onPick }) {
  const { homeTeam, awayTeam, kickoff, network, isInternational, internationalCity } = game;

  const kickoffLabel = kickoff
    ? new Date(kickoff).toLocaleString('en-US', {
        weekday: 'short', month: 'short', day: 'numeric',
        hour: 'numeric', minute: '2-digit', timeZoneName: 'short',
      })
    : null;

  return (
    <div className={`game-card${locked ? ' game-card--locked' : ''}`}>
      <div className="game-card__meta">
        {isInternational && (
          <span className="game-card__badge game-card__badge--intl">
            {internationalCity}
          </span>
        )}
        {kickoffLabel && <span className="game-card__kickoff">{kickoffLabel}</span>}
        {network && <span className="game-card__network">{network}</span>}
      </div>

      <TeamButton
        teamId={awayTeam}
        label="away"
        picked={picked}
        result={result}
        locked={locked}
        onPick={onPick}
      />
      <div className="game-card__divider">@</div>
      <TeamButton
        teamId={homeTeam}
        label="home"
        picked={picked}
        result={result}
        locked={locked}
        onPick={onPick}
      />
    </div>
  );
}

function TeamButton({ teamId, label, picked, result, locked, onPick }) {
  const team = TEAMS[teamId];
  const hasPicked = picked === teamId;
  const hasResult = result !== null && result !== undefined;
  const isWinner = hasResult && result === teamId;
  const isLoser  = hasResult && result !== teamId;

  let modifier = '';
  if (hasResult) {
    if (isWinner && hasPicked) modifier = 'correct';
    else if (isWinner)         modifier = 'result';
    else if (isLoser && hasPicked) modifier = 'wrong';
  } else if (hasPicked) {
    modifier = 'selected';
  }

  const cls = ['game-card__team', modifier ? `game-card__team--${modifier}` : '']
    .filter(Boolean)
    .join(' ');

  return (
    <button
      className={cls}
      disabled={locked || hasResult}
      onClick={() => onPick?.(teamId)}
      aria-label={`Pick ${team?.name ?? teamId}`}
      aria-pressed={hasPicked}
    >
      <span className="game-card__team-abbr">{team?.abbr ?? teamId}</span>
      <span className="game-card__team-name">{team?.name ?? teamId}</span>
      <span className="game-card__team-label">{label}</span>
    </button>
  );
}
