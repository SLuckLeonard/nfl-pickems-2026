import { useState, useMemo } from 'react';
import { isLocked } from '../data/weekLocks.js';
import {
  getDivisionStandings,
  getPlayoffSeeds,
  getWildCardMatchups,
  getDivisionalMatchups,
  getChampionshipMatchup,
  getSuperBowlMatchup,
  sanitizeBracketPicks,
} from '../engine/bracketEngine.js';
import BracketGame, { ByeBlock } from './BracketGame.jsx';

const PICK_THRESHOLD = 100;

function ConferenceBracket({ conf, seeds, bracketPicks, onPick, locked }) {
  const wcMatchups   = useMemo(() => getWildCardMatchups(seeds, conf),                    [seeds, conf]);
  const divMatchups  = useMemo(() => getDivisionalMatchups(seeds, bracketPicks, conf),     [seeds, bracketPicks, conf]);
  const champMatchup = useMemo(() => getChampionshipMatchup(seeds, bracketPicks, conf),    [seeds, bracketPicks, conf]);

  return (
    <div className="bracket-conf">
      <div className="bracket-conf-label">{conf}</div>
      <div className="bracket-rounds">
        {/* Wild Card */}
        <div className="bracket-col">
          <div className="bracket-round-label">Wild Card</div>
          <BracketGame
            matchup={wcMatchups[0]}
            bracketPick={bracketPicks[wcMatchups[0].gameKey]}
            onPick={onPick && (tid => onPick(wcMatchups[0].gameKey, tid))}
            locked={locked}
          />
          <ByeBlock seedObj={seeds[0]} />
          <BracketGame
            matchup={wcMatchups[1]}
            bracketPick={bracketPicks[wcMatchups[1].gameKey]}
            onPick={onPick && (tid => onPick(wcMatchups[1].gameKey, tid))}
            locked={locked}
          />
          <BracketGame
            matchup={wcMatchups[2]}
            bracketPick={bracketPicks[wcMatchups[2].gameKey]}
            onPick={onPick && (tid => onPick(wcMatchups[2].gameKey, tid))}
            locked={locked}
          />
        </div>

        {/* Divisional */}
        <div className="bracket-col bracket-col--div">
          <div className="bracket-round-label">Divisional</div>
          <BracketGame
            matchup={divMatchups[0]}
            bracketPick={bracketPicks[divMatchups[0].gameKey]}
            onPick={onPick && (tid => onPick(divMatchups[0].gameKey, tid))}
            locked={locked}
          />
          <BracketGame
            matchup={divMatchups[1]}
            bracketPick={bracketPicks[divMatchups[1].gameKey]}
            onPick={onPick && (tid => onPick(divMatchups[1].gameKey, tid))}
            locked={locked}
          />
        </div>

        {/* Championship */}
        <div className="bracket-col bracket-col--champ">
          <div className="bracket-round-label">Conf. Champ.</div>
          <BracketGame
            matchup={champMatchup}
            bracketPick={bracketPicks[champMatchup.gameKey]}
            onPick={onPick && (tid => onPick(champMatchup.gameKey, tid))}
            locked={locked}
          />
        </div>
      </div>
    </div>
  );
}

function SuperBowlSlot({ afcSeeds, nfcSeeds, bracketPicks, onPick, locked }) {
  const sbMatchup = useMemo(
    () => getSuperBowlMatchup(afcSeeds, nfcSeeds, bracketPicks),
    [afcSeeds, nfcSeeds, bracketPicks]
  );
  return (
    <div className="superbowl-slot">
      <div className="superbowl-label">Super Bowl</div>
      <BracketGame
        matchup={sbMatchup}
        bracketPick={bracketPicks[sbMatchup.gameKey]}
        onPick={onPick && (tid => onPick(sbMatchup.gameKey, tid))}
        locked={locked}
      />
    </div>
  );
}

export default function BracketPanel({
  localPicks, playerName,
  bracketPicks, onBracketPicksChange,
  otherPicksMap, otherPlayerName, otherBracketPicks,
  bracketLocked, bracketHidden,
  schedule,
}) {
  const [activePlayer, setActivePlayer] = useState('me');
  const picksCount = Object.keys(localPicks).length;

  const bracketIsLocked = bracketLocked || isLocked('preseason');
  const hasOther        = !!otherPlayerName;

  // Always compute both — hooks must not be conditional
  const myDivStandings = useMemo(() => getDivisionStandings(localPicks, schedule),         [localPicks, schedule]);
  const myAfcSeeds     = useMemo(() => getPlayoffSeeds(myDivStandings, 'AFC', localPicks, schedule), [myDivStandings, localPicks, schedule]);
  const myNfcSeeds     = useMemo(() => getPlayoffSeeds(myDivStandings, 'NFC', localPicks, schedule), [myDivStandings, localPicks, schedule]);

  const otherPicks         = otherPicksMap ?? {};
  const otherDivStandings  = useMemo(() => getDivisionStandings(otherPicks, schedule),         [otherPicks, schedule]);
  const otherAfcSeeds      = useMemo(() => getPlayoffSeeds(otherDivStandings, 'AFC', otherPicks, schedule), [otherDivStandings, otherPicks, schedule]);
  const otherNfcSeeds      = useMemo(() => getPlayoffSeeds(otherDivStandings, 'NFC', otherPicks, schedule), [otherDivStandings, otherPicks, schedule]);

  const displayAfcSeeds     = activePlayer === 'me' ? myAfcSeeds     : otherAfcSeeds;
  const displayNfcSeeds     = activePlayer === 'me' ? myNfcSeeds     : otherNfcSeeds;
  const displayBracketPicks = activePlayer === 'me' ? (bracketPicks ?? {}) : (otherBracketPicks ?? {});

  const showOtherHidden = activePlayer === 'other' && !bracketIsLocked && (bracketHidden ?? true);
  const canInteract     = activePlayer === 'me' && !bracketIsLocked;

  function handleBracketPick(gameKey, teamId) {
    if (!canInteract) return;
    const updated = { ...(bracketPicks ?? {}) };
    if (updated[gameKey] === teamId) {
      delete updated[gameKey];
    } else {
      updated[gameKey] = teamId;
    }
    onBracketPicksChange(sanitizeBracketPicks(updated, myAfcSeeds, myNfcSeeds));
  }

  if (picksCount < PICK_THRESHOLD) {
    return (
      <div className="panel-empty">
        Make more picks to see your predicted bracket — standings update as you pick.
        <br />
        <span style={{ fontSize: '11px', marginTop: 4, display: 'block' }}>
          ({picksCount} / {PICK_THRESHOLD} picks made)
        </span>
      </div>
    );
  }

  return (
    <div className="bracket-body">
      {hasOther && (
        <div className="panel-player-toggle">
          <button
            className={`panel-tab ${activePlayer === 'me' ? 'panel-tab--active' : ''}`}
            onClick={() => setActivePlayer('me')}
          >
            {playerName ?? 'Me'}
          </button>
          <button
            className={`panel-tab ${activePlayer === 'other' ? 'panel-tab--active' : ''}`}
            onClick={() => setActivePlayer('other')}
          >
            {otherPlayerName}
          </button>
        </div>
      )}

      {showOtherHidden ? (
        <div className="panel-empty">
          {otherPlayerName}&apos;s bracket picks are hidden until the bracket locks.
        </div>
      ) : (
        <>
          <ConferenceBracket
            conf="AFC"
            seeds={displayAfcSeeds}
            bracketPicks={displayBracketPicks}
            onPick={canInteract ? handleBracketPick : null}
            locked={!canInteract}
          />
          <ConferenceBracket
            conf="NFC"
            seeds={displayNfcSeeds}
            bracketPicks={displayBracketPicks}
            onPick={canInteract ? handleBracketPick : null}
            locked={!canInteract}
          />
          <SuperBowlSlot
            afcSeeds={displayAfcSeeds}
            nfcSeeds={displayNfcSeeds}
            bracketPicks={displayBracketPicks}
            onPick={canInteract ? handleBracketPick : null}
            locked={!canInteract}
          />
        </>
      )}
    </div>
  );
}
