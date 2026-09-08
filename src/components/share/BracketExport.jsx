import { TEAMS } from '../../data/teams.js';
import {
  getWildCardMatchups,
  getDivisionalMatchups,
  getChampionshipMatchup,
  getSuperBowlMatchup,
} from '../../engine/bracketEngine.js';
import TeamLogo from '../TeamLogo.jsx';

function Slot({ seedObj, picked, dim }) {
  if (!seedObj) {
    return <div className="xbg-slot xbg-slot--tbd">TBD</div>;
  }
  const abbr = TEAMS[seedObj.teamId]?.abbr ?? seedObj.teamId;
  return (
    <div className={`xbg-slot${picked ? ' xbg-slot--win' : ''}${dim ? ' xbg-slot--dim' : ''}`}>
      <span className="xbg-seed">{seedObj.seed}</span>
      <TeamLogo teamId={seedObj.teamId} size={18} />
      <span className="xbg-abbr">{abbr}</span>
    </div>
  );
}

function Game({ matchup, bracketPicks }) {
  if (!matchup) return <div className="xbg-game" />;
  const pick = bracketPicks[matchup.gameKey];
  const decided = !!pick;
  return (
    <div className="xbg-game">
      <Slot
        seedObj={matchup.top}
        picked={pick === matchup.top?.teamId}
        dim={decided && pick !== matchup.top?.teamId}
      />
      <Slot
        seedObj={matchup.bottom}
        picked={pick === matchup.bottom?.teamId}
        dim={decided && pick !== matchup.bottom?.teamId}
      />
    </div>
  );
}

function ConferenceColumn({ conf, seeds, bracketPicks }) {
  const wc = getWildCardMatchups(seeds, conf);
  const div = getDivisionalMatchups(seeds, bracketPicks, conf);
  const champ = getChampionshipMatchup(seeds, bracketPicks, conf);
  const byeSeed = seeds[0] ?? null;

  return (
    <div className="xbg-conf">
      <div className="xbg-conf__label">{conf}</div>
      <div className="xbg-rounds">
        <div className="xbg-round">
          <div className="xbg-round__label">Wild Card</div>
          {byeSeed && (
            <div className="xbg-game xbg-game--bye">
              <div className="xbg-slot xbg-slot--win">
                <span className="xbg-seed">{byeSeed.seed}</span>
                <TeamLogo teamId={byeSeed.teamId} size={18} />
                <span className="xbg-abbr">{TEAMS[byeSeed.teamId]?.abbr ?? byeSeed.teamId}</span>
                <span className="xbg-bye">BYE</span>
              </div>
            </div>
          )}
          {wc.map((m) => (
            <Game key={m.gameKey} matchup={m} bracketPicks={bracketPicks} />
          ))}
        </div>

        <div className="xbg-round">
          <div className="xbg-round__label">Divisional</div>
          {div.map((m) => (
            <Game key={m.gameKey} matchup={m} bracketPicks={bracketPicks} />
          ))}
        </div>

        <div className="xbg-round">
          <div className="xbg-round__label">Conf. Champ.</div>
          <Game matchup={champ} bracketPicks={bracketPicks} />
        </div>
      </div>
    </div>
  );
}

export default function BracketExport({ afcSeeds, nfcSeeds, bracketPicks = {} }) {
  const sb = getSuperBowlMatchup(afcSeeds, nfcSeeds, bracketPicks);
  const sbPick = bracketPicks[sb.gameKey];
  const champTeam =
    sbPick === sb.top?.teamId ? sb.top : sbPick === sb.bottom?.teamId ? sb.bottom : null;

  return (
    <div className="export-bracket">
      <ConferenceColumn conf="AFC" seeds={afcSeeds} bracketPicks={bracketPicks} />
      <ConferenceColumn conf="NFC" seeds={nfcSeeds} bracketPicks={bracketPicks} />

      <div className="xbg-superbowl">
        <div className="xbg-round__label">Super Bowl</div>
        <Game matchup={sb} bracketPicks={bracketPicks} />
        <div className="xbg-champ">
          {champTeam ? (
            <>
              <span className="xbg-champ__label">Champion</span>
              <span className="xbg-champ__team">
                <TeamLogo teamId={champTeam.teamId} size={26} />
                {TEAMS[champTeam.teamId]?.name ?? champTeam.teamId}
              </span>
            </>
          ) : (
            <span className="xbg-champ__label">Pick the Super Bowl winner</span>
          )}
        </div>
      </div>
    </div>
  );
}
