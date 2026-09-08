import { Fragment, useMemo } from 'react';
import { TEAMS } from '../../data/teams.js';
import { getDivisionStandings, getPlayoffSeeds } from '../../engine/bracketEngine.js';
import TeamLogo from '../TeamLogo.jsx';

const DIV_ORDER = {
  AFC: ['AFC East', 'AFC North', 'AFC South', 'AFC West'],
  NFC: ['NFC East', 'NFC North', 'NFC South', 'NFC West'],
};

function pct(w, l) {
  const g = w + l;
  return g > 0 ? (w / g).toFixed(3) : '.000';
}

function recordCell(w, l) {
  return `${w}-${l}`;
}

/**
 * Ranked list of all 16 teams in a conference: playoff seeds 1–7 in seed order,
 * then everyone else by predicted wins. A cut line is drawn after seed 7.
 */
function ConferenceTable({ picksMap, schedule, conference }) {
  const rows = useMemo(() => {
    const divStandings = getDivisionStandings(picksMap, schedule);
    const seeds = getPlayoffSeeds(divStandings, conference, picksMap, schedule);
    const seedByTeam = new Map(seeds.map((s) => [s.teamId, s.seed]));

    const all = DIV_ORDER[conference].flatMap((divName) => divStandings[divName] ?? []);
    const seeded = seeds.map((s) => ({ ...s, seed: s.seed }));
    const rest = all
      .filter((t) => !seedByTeam.has(t.teamId))
      .sort((a, b) => b.wins - a.wins || a.teamId.localeCompare(b.teamId))
      .map((t) => ({ ...t, seed: null }));

    return [...seeded, ...rest];
  }, [picksMap, schedule, conference]);

  return (
    <table className="export-standings">
      <thead>
        <tr>
          <th className="col-rank">#</th>
          <th className="col-team">Team</th>
          <th className="col-num">REC</th>
          <th className="col-num">PCT</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row, idx) => (
          <Fragment key={row.teamId}>
            <tr>
              <td className="col-rank">
                {row.seed ? <span className="seed-badge">{row.seed}</span> : idx + 1}
              </td>
              <td className="col-team">
                <span className="export-team">
                  <TeamLogo teamId={row.teamId} size={22} />
                  <span className="export-team__name">{TEAMS[row.teamId]?.name ?? row.teamId}</span>
                </span>
              </td>
              <td className="col-num">{recordCell(row.wins, row.losses)}</td>
              <td className="col-num">{pct(row.wins, row.losses)}</td>
            </tr>
            {idx === 6 && (
              <tr className="export-standings__cutline" aria-hidden="true">
                <td colSpan={4}>Playoff cutoff</td>
              </tr>
            )}
          </Fragment>
        ))}
      </tbody>
    </table>
  );
}

/** Four division blocks for a conference; division leader flagged. */
function DivisionTables({ picksMap, schedule, conference }) {
  const divStandings = useMemo(
    () => getDivisionStandings(picksMap, schedule),
    [picksMap, schedule]
  );

  return (
    <div className="export-divisions">
      {DIV_ORDER[conference].map((divName) => {
        const teams = divStandings[divName] ?? [];
        return (
          <div key={divName} className="export-division">
            <div className="export-division__title">{divName}</div>
            <table className="export-standings">
              <tbody>
                {teams.map((row, idx) => (
                  <tr key={row.teamId} className={idx === 0 ? 'export-division__leader' : ''}>
                    <td className="col-rank">{idx + 1}</td>
                    <td className="col-team">
                      <span className="export-team">
                        <TeamLogo teamId={row.teamId} size={20} />
                        <span className="export-team__name">
                          {TEAMS[row.teamId]?.name ?? row.teamId}
                        </span>
                        {idx === 0 && <span className="pill">z</span>}
                      </span>
                    </td>
                    <td className="col-num">{recordCell(row.wins, row.losses)}</td>
                    <td className="col-num">{pct(row.wins, row.losses)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      })}
    </div>
  );
}

export default function StandingsExport({ picksMap, schedule, mode, conference }) {
  return mode === 'division' ? (
    <DivisionTables picksMap={picksMap} schedule={schedule} conference={conference} />
  ) : (
    <ConferenceTable picksMap={picksMap} schedule={schedule} conference={conference} />
  );
}
