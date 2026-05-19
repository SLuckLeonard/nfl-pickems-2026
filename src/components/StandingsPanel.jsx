import { useState, useMemo } from 'react';
import { TEAMS } from '../data/teams.js';
import { getDivisionStandings } from '../engine/bracketEngine.js';
import TeamLogo from './TeamLogo.jsx';

const DIV_ORDER = {
  AFC: ['AFC East', 'AFC North', 'AFC South', 'AFC West'],
  NFC: ['NFC East', 'NFC North', 'NFC South', 'NFC West'],
};

export default function StandingsPanel({ localPicks, schedule, results }) {
  const [conf, setConf] = useState('AFC');

  const divStandings = useMemo(
    () => getDivisionStandings(localPicks, schedule),
    [localPicks, schedule]
  );

  const hasResults = Object.keys(results?.games ?? {}).length > 0;

  const actualWins = useMemo(() => {
    if (!hasResults) return {};
    const counts = {};
    for (const teamId of Object.values(results?.games ?? {})) {
      counts[teamId] = (counts[teamId] ?? 0) + 1;
    }
    return counts;
  }, [results, hasResults]);

  return (
    <>
      <div className="panel-conf-tabs">
        {['AFC', 'NFC'].map(c => (
          <button
            key={c}
            className={`panel-tab ${conf === c ? 'panel-tab--active' : ''}`}
            onClick={() => setConf(c)}
          >
            {c}
          </button>
        ))}
      </div>

      <div className="standings-body">
        {DIV_ORDER[conf].map(divName => {
          const teams = divStandings[divName] ?? [];
          const shortName = divName.replace(`${conf} `, '');
          return (
            <div key={divName} className="division-block">
              <div className="division-title">{conf} {shortName}</div>
              <table className="division-table">
                <thead>
                  <tr>
                    <th>Team</th>
                    <th>W</th>
                    <th>L</th>
                    {hasResults && <th>Act.</th>}
                  </tr>
                </thead>
                <tbody>
                  {teams.map((row, idx) => (
                    <tr key={row.teamId} className={idx === 0 ? 'division-leader' : ''}>
                      <td>
                        <div className="standings-team">
                          <TeamLogo teamId={row.teamId} size={16} />
                          <span>{TEAMS[row.teamId]?.abbr ?? row.teamId}</span>
                          {idx === 0 && <span className="division-winner-marker" title="Division leader">z</span>}
                        </div>
                      </td>
                      <td className="standings-num">{row.wins}</td>
                      <td className="standings-num">{row.losses}</td>
                      {hasResults && <td className="standings-num">{actualWins[row.teamId] ?? 0}</td>}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        })}
      </div>
    </>
  );
}
