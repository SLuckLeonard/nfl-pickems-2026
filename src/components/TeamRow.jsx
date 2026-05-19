import { TEAMS } from '../data/teams.js';
import { ouStatus } from '../engine/statsEngine.js';
import TeamLogo from './TeamLogo.jsx';

const STATUS_LABEL = { over: 'OVER', under: 'UNDER', push: 'PUSH' };
const STATUS_CLASS = { over: 'text-success', under: 'text-error', push: 'text-warning' };

/**
 * A single row in the O/U tracker table on the Dashboard.
 *
 * Columns: Team | O/U Line | P1 Predicted | P2 Predicted |
 *          Actual Wins | Projected Final | P1 Status | P2 Status
 *
 * Highlighted amber when the projected final is within 0.5 wins of the O/U line.
 *
 * @param {{ teamId: string, ouLine: number|null, p1Predicted: number,
 *            p2Predicted: number, actualWins: number,
 *            projected: number|null }} props
 */
export default function TeamRow({ teamId, ouLine, p1Predicted, p2Predicted, actualWins, projected }) {
  const team = TEAMS[teamId];

  const p1Status = ouStatus(p1Predicted, ouLine);
  const p2Status = ouStatus(p2Predicted, ouLine);

  const isCloseCall =
    ouLine != null &&
    projected != null &&
    Math.abs(projected - ouLine) <= 0.5;

  return (
    <tr className={isCloseCall ? 'row--close-call' : undefined}>
      <td>
        <TeamLogo teamId={teamId} size={20} />
        <span className="text-muted"> {team?.city}</span>
      </td>
      <td className="font-mono">{ouLine ?? '—'}</td>
      <td className="font-mono">{p1Predicted}</td>
      <td className="font-mono">{p2Predicted}</td>
      <td className="font-mono">{actualWins}</td>
      <td className="font-mono">
        {projected != null ? projected.toFixed(1) : '—'}
        {isCloseCall && <span className="close-call-marker" title="Within 0.5 of line"> *</span>}
      </td>
      <td className={STATUS_CLASS[p1Status] ?? 'text-muted'}>
        {STATUS_LABEL[p1Status] ?? '—'}
      </td>
      <td className={STATUS_CLASS[p2Status] ?? 'text-muted'}>
        {STATUS_LABEL[p2Status] ?? '—'}
      </td>
    </tr>
  );
}
