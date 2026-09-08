import { useMemo } from 'react';
import { TEAMS } from '../../data/teams.js';
import { getDivisionStandings } from '../../engine/bracketEngine.js';
import TeamLogo from '../TeamLogo.jsx';

const WEEKS = 18;
const ORDINAL = ['', '1st', '2nd', '3rd', '4th'];

/**
 * One team's full season from a picks map: week-by-week opponent, predicted
 * result, and running record. Unpicked games show as "–" and don't move the
 * record. A bye week is inserted where the team has no game.
 */
export default function TeamScheduleExport({ teamId, picksMap, schedule }) {
  const { rows, wins, losses, place, divName } = useMemo(() => {
    const games = schedule
      .filter((g) => g.homeTeam === teamId || g.awayTeam === teamId)
      .sort((a, b) => a.week - b.week);

    const byWeek = new Map(games.map((g) => [g.week, g]));
    let w = 0;
    let l = 0;
    const out = [];

    for (let week = 1; week <= WEEKS; week++) {
      const g = byWeek.get(week);
      if (!g) {
        out.push({ week, bye: true, record: `${w}-${l}` });
        continue;
      }
      const isHome = g.homeTeam === teamId;
      const opp = isHome ? g.awayTeam : g.homeTeam;
      const pick = picksMap[g.gameId];
      let result = null;
      if (pick === teamId) { w++; result = 'W'; }
      else if (pick === opp) { l++; result = 'L'; }
      out.push({ week, isHome, opp, result, record: result ? `${w}-${l}` : '' });
    }

    const ds = getDivisionStandings(picksMap, schedule);
    const team = TEAMS[teamId];
    const dName = team ? `${team.conf} ${team.div}` : '';
    const divRows = ds[dName] ?? [];
    const idx = divRows.findIndex((r) => r.teamId === teamId);

    return {
      rows: out,
      wins: w,
      losses: l,
      place: idx >= 0 ? idx + 1 : null,
      divName: dName,
    };
  }, [teamId, picksMap, schedule]);

  return (
    <div className="export-schedule">
      <div className="export-schedule__summary">
        <div className="export-schedule__record">
          <span className="export-schedule__record-num">{wins}-{losses}</span>
          <span className="export-schedule__record-label">predicted record</span>
        </div>
        {place && (
          <div className="export-schedule__finish">
            <span className="export-schedule__record-num">{ORDINAL[place] ?? `${place}th`}</span>
            <span className="export-schedule__record-label">in {divName}</span>
          </div>
        )}
      </div>

      <table className="export-standings">
        <thead>
          <tr>
            <th className="col-rank">WK</th>
            <th className="col-team">Opponent</th>
            <th className="col-num">Pred</th>
            <th className="col-num">Rec</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.week} className={row.bye ? 'export-schedule__bye' : ''}>
              <td className="col-rank">{row.week}</td>
              <td className="col-team">
                {row.bye ? (
                  <span className="export-schedule__bye-label">BYE WEEK</span>
                ) : (
                  <span className="export-team">
                    <span className="export-schedule__loc">{row.isHome ? 'vs' : '@'}</span>
                    <TeamLogo teamId={row.opp} size={20} />
                    <span className="export-team__name">{TEAMS[row.opp]?.name ?? row.opp}</span>
                  </span>
                )}
              </td>
              <td className="col-num">
                {row.bye ? '' : row.result
                  ? <span className={`res res--${row.result === 'W' ? 'w' : 'l'}`}>{row.result}</span>
                  : '–'}
              </td>
              <td className="col-num">{row.record}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
