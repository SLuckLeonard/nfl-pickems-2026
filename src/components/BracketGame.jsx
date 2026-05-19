import TeamLogo from './TeamLogo.jsx';
import { TEAMS } from '../data/teams.js';

function TeamSlot({ seedObj, isPicked, onPick, locked }) {
  if (!seedObj) {
    return <div className="bracket-team bracket-team--tbd">TBD</div>;
  }

  const abbr = TEAMS[seedObj.teamId]?.abbr ?? seedObj.teamId;
  const cls  = `bracket-team${isPicked ? ' bracket-team--winner' : ''}`;

  return (
    <button
      className={cls}
      onClick={() => onPick && onPick(seedObj.teamId)}
      disabled={locked || !onPick}
    >
      <span className="bracket-seed">{seedObj.seed}</span>
      <TeamLogo teamId={seedObj.teamId} size={14} />
      <span className="bracket-team-name">{abbr}</span>
    </button>
  );
}

export default function BracketGame({ matchup, bracketPick, onPick, locked }) {
  if (!matchup) return null;
  return (
    <div className="bracket-game">
      <TeamSlot
        seedObj={matchup.top}
        isPicked={bracketPick === matchup.top?.teamId}
        onPick={onPick}
        locked={locked}
      />
      <TeamSlot
        seedObj={matchup.bottom}
        isPicked={bracketPick === matchup.bottom?.teamId}
        onPick={onPick}
        locked={locked}
      />
    </div>
  );
}

export function ByeBlock({ seedObj }) {
  if (!seedObj) return null;
  const abbr = TEAMS[seedObj.teamId]?.abbr ?? seedObj.teamId;
  return (
    <div className="bracket-game bracket-game--bye">
      <div className="bracket-team bracket-team--bye">
        <span className="bracket-seed">{seedObj.seed}</span>
        <TeamLogo teamId={seedObj.teamId} size={14} />
        <span className="bracket-team-name">{abbr}</span>
        <span className="bracket-bye-label">BYE</span>
      </div>
    </div>
  );
}
