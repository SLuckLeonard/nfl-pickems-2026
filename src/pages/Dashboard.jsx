import { useState, useMemo } from 'react';
import { useResults, useAllPicks, useSeasonConfig, usePlayers } from '../hooks/useFirestore.js';
import { useCurrentWeek } from '../hooks/useCurrentWeek.js';
import { SCHEDULE } from '../data/schedule2026.js';
import { TEAMS } from '../data/teams.js';
import StatCard from '../components/StatCard.jsx';
import {
  weeklyAccuracy,
  overallAccuracy,
  rollingAccuracy,
  currentStreak,
  headToHeadWeekly,
  headToHeadRecord,
  divisionAccuracy,
  upsetGames,
  predictedWinsFromPicks,
  ouPace,
  ouStatus,
  ouTrendingAccuracy,
  bestAndWorstWeek,
  gamesDecided,
  gamesRemaining,
} from '../engine/statsEngine.js';
import '../styles/dashboard.css';

// ── Module-level constants ─────────────────────────────────────────────────

const WEEK_COUNT = 18;

const DIVISION_ORDER = [
  'AFC East', 'AFC North', 'AFC South', 'AFC West',
  'NFC East', 'NFC North', 'NFC South', 'NFC West',
];

const TEAM_IDS = Object.keys(TEAMS);

const MONTH_ABBR = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

// ── Pure helpers ──────────────────────────────────────────────────────────

function fmtPct(pct) {
  if (pct === null || pct === undefined) return '—';
  return `${(pct * 100).toFixed(1)}%`;
}

function weekDateRange(week) {
  const games = SCHEDULE.filter(g => g.week === week);
  if (!games.length) return '—';
  const dates = games.map(g => new Date(g.date + 'T12:00:00')).sort((a, b) => a - b);
  const first = dates[0];
  const last  = dates[dates.length - 1];
  if (first.getMonth() === last.getMonth()) {
    return `${MONTH_ABBR[first.getMonth()]} ${first.getDate()}–${last.getDate()}`;
  }
  return `${MONTH_ABBR[first.getMonth()]} ${first.getDate()}–${MONTH_ABBR[last.getMonth()]} ${last.getDate()}`;
}

// Preseason pick accuracy for a single week's games (not in stats engine).
function preseasonWeekAcc(allPicks, results, playerId, week) {
  const doc = allPicks.find(p => p.playerId === playerId && p.type === 'preseason');
  if (!doc) return { correct: 0, total: 0, pct: null };
  const picksMap = doc.picks ?? {};
  const weekResults = Object.fromEntries(
    Object.entries(results?.games ?? {}).filter(([id]) => {
      const m = id.match(/_W(\d+)_/);
      return m && parseInt(m[1], 10) === week;
    })
  );
  let correct = 0, total = 0;
  for (const [gameId, result] of Object.entries(weekResults)) {
    if (picksMap[gameId] === undefined) continue;
    total++;
    if (picksMap[gameId] === result) correct++;
  }
  return { correct, total, pct: total > 0 ? correct / total : null };
}

// Longest run of correct or incorrect picks in chronological order.
function longestStreakOf(allPicks, results, playerId, streakType) {
  const allGames = results?.games ?? {};
  if (!Object.keys(allGames).length) return 0;

  const resolved = Object.entries(allGames).sort(([a], [b]) => {
    const wa = parseInt(a.match(/_W(\d+)_/)?.[1] ?? '0');
    const wb = parseInt(b.match(/_W(\d+)_/)?.[1] ?? '0');
    return wa !== wb ? wa - wb : a.localeCompare(b);
  });

  const picksMap = {};
  for (const doc of allPicks) {
    if (doc.playerId === playerId && doc.type.startsWith('week_')) {
      Object.assign(picksMap, doc.picks ?? {});
    }
  }

  let longest = 0, current = 0;
  for (const [gameId, result] of resolved) {
    const picked = picksMap[gameId];
    if (picked === undefined) continue;
    const isCorrect = picked === result;
    const matches   = streakType === 'correct' ? isCorrect : !isCorrect;
    if (matches) { current++; longest = Math.max(longest, current); }
    else           current = 0;
  }
  return longest;
}

function ouStatusLabel(status) {
  if (!status) return '—';
  return status.toUpperCase();
}

function ouStatusClass(status) {
  if (status === 'over')  return 'cell--success';
  if (status === 'under') return 'cell--error';
  if (status === 'push')  return 'cell--muted';
  return '';
}

function wlLabel(acc) {
  if (!acc || !acc.total) return '0-0';
  return `${acc.correct}-${acc.total - acc.correct}`;
}

function ratioLabel(acc) {
  if (!acc || !acc.total) return '—';
  return `${acc.correct}/${acc.total}`;
}

// ── Sub-components ────────────────────────────────────────────────────────

function PlayerCard({ player, weeklyAcc, preAcc, streak }) {
  return (
    <div className="player-card">
      <div className="player-card__name">{player?.playerName ?? '—'}</div>
      <div className="player-card__stat">
        <span className="player-card__label">Weekly</span>
        <span className="player-card__val">{wlLabel(weeklyAcc)}</span>
      </div>
      <div className="player-card__stat">
        <span className="player-card__label">Pre-Season</span>
        <span className="player-card__val">{wlLabel(preAcc)}</span>
      </div>
      <div className="player-card__stat">
        <span className="player-card__label">Streak</span>
        <span className="player-card__val">
          {streak?.count && streak?.type ? `${streak.count} ${streak.type}` : '—'}
        </span>
      </div>
    </div>
  );
}

function SortableTh({ col, sort, onSort, children }) {
  const active = sort.col === col;
  return (
    <th
      className={`sortable-th${active ? ' sortable-th--active' : ''}`}
      onClick={() => onSort(prev =>
        prev.col === col
          ? { col, dir: prev.dir === 'asc' ? 'desc' : 'asc' }
          : { col, dir: 'asc' }
      )}
    >
      {children}{active ? (sort.dir === 'asc' ? ' ↑' : ' ↓') : ''}
    </th>
  );
}

// ── Main component ────────────────────────────────────────────────────────

export default function Dashboard() {
  const { results, loading: rLoading } = useResults();
  const { picks,   loading: pLoading } = useAllPicks();
  const { config,  loading: cLoading } = useSeasonConfig();
  const { players, loading: plLoading } = usePlayers();
  const currentWeek = useCurrentWeek();

  const [weekSort, setWeekSort] = useState({ col: 'week', dir: 'asc' });

  const loading = rLoading || pLoading || cLoading || plLoading;

  // Consistent p1/p2 ordering by registration time
  const [p1, p2] = useMemo(() => {
    const sorted = [...players].sort((a, b) => {
      const at = a.createdAt?.toMillis?.() ?? 0;
      const bt = b.createdAt?.toMillis?.() ?? 0;
      return at - bt;
    });
    return [sorted[0] ?? null, sorted[1] ?? null];
  }, [players]);

  const ouLines = config?.ouLines ?? {};

  // ── 4a: H2H ───────────────────────────────────────────────────────────────
  const h2hRecord = useMemo(
    () => p1 && p2 ? headToHeadRecord(picks, results, p1.playerId, p2.playerId) : null,
    [picks, results, p1, p2]
  );
  const h2hWeekly = useMemo(
    () => p1 && p2 ? headToHeadWeekly(picks, results, p1.playerId, p2.playerId) : [],
    [picks, results, p1, p2]
  );

  // ── 4b: Overall accuracy & stat cards ────────────────────────────────────
  const p1WeeklyAcc = useMemo(() => p1 ? overallAccuracy(picks, results, p1.playerId, 'weekly')   : null, [picks, results, p1]);
  const p2WeeklyAcc = useMemo(() => p2 ? overallAccuracy(picks, results, p2.playerId, 'weekly')   : null, [picks, results, p2]);
  const p1PreAcc    = useMemo(() => p1 ? overallAccuracy(picks, results, p1.playerId, 'preseason') : null, [picks, results, p1]);
  const p2PreAcc    = useMemo(() => p2 ? overallAccuracy(picks, results, p2.playerId, 'preseason') : null, [picks, results, p2]);

  const p1OuAcc = useMemo(
    () => p1 && Object.keys(ouLines).length ? ouTrendingAccuracy(picks, results, ouLines, p1.playerId, SCHEDULE) : null,
    [picks, results, ouLines, p1]
  );
  const p2OuAcc = useMemo(
    () => p2 && Object.keys(ouLines).length ? ouTrendingAccuracy(picks, results, ouLines, p2.playerId, SCHEDULE) : null,
    [picks, results, ouLines, p2]
  );

  const decided   = useMemo(() => gamesDecided(results),            [results]);
  const remaining = useMemo(() => gamesRemaining(results, SCHEDULE), [results]);

  // Streaks for player cards
  const p1Streak = useMemo(() => p1 ? currentStreak(picks, results, p1.playerId, 'weekly') : null, [picks, results, p1]);
  const p2Streak = useMemo(() => p2 ? currentStreak(picks, results, p2.playerId, 'weekly') : null, [picks, results, p2]);

  // ── 4d: Rolling stats ─────────────────────────────────────────────────────
  const p1Rolling   = useMemo(() => p1 ? rollingAccuracy(picks, results, p1.playerId, currentWeek) : null, [picks, results, p1, currentWeek]);
  const p2Rolling   = useMemo(() => p2 ? rollingAccuracy(picks, results, p2.playerId, currentWeek) : null, [picks, results, p2, currentWeek]);
  const p1BestWorst = useMemo(() => p1 ? bestAndWorstWeek(picks, results, p1.playerId, 'weekly') : null, [picks, results, p1]);
  const p2BestWorst = useMemo(() => p2 ? bestAndWorstWeek(picks, results, p2.playerId, 'weekly') : null, [picks, results, p2]);
  const p1LongestOk  = useMemo(() => p1 ? longestStreakOf(picks, results, p1.playerId, 'correct')   : 0, [picks, results, p1]);
  const p2LongestOk  = useMemo(() => p2 ? longestStreakOf(picks, results, p2.playerId, 'correct')   : 0, [picks, results, p2]);
  const p1LongestErr = useMemo(() => p1 ? longestStreakOf(picks, results, p1.playerId, 'incorrect') : 0, [picks, results, p1]);
  const p2LongestErr = useMemo(() => p2 ? longestStreakOf(picks, results, p2.playerId, 'incorrect') : 0, [picks, results, p2]);

  // ── 4c: Weekly accuracy table ─────────────────────────────────────────────
  const weeklyRows = useMemo(() => {
    return Array.from({ length: WEEK_COUNT }, (_, i) => {
      const week  = i + 1;
      const p1w   = p1 ? weeklyAccuracy(picks, results, p1.playerId, week) : { correct: 0, total: 0, pct: null };
      const p2w   = p2 ? weeklyAccuracy(picks, results, p2.playerId, week) : { correct: 0, total: 0, pct: null };
      const p1pre = p1 ? preseasonWeekAcc(picks, results, p1.playerId, week) : { correct: 0, total: 0, pct: null };
      const p2pre = p2 ? preseasonWeekAcc(picks, results, p2.playerId, week) : { correct: 0, total: 0, pct: null };

      let weekWinner = null;
      if (p1w.pct !== null && p2w.pct !== null) {
        if      (p1w.pct > p2w.pct) weekWinner = p1?.playerName ?? 'P1';
        else if (p2w.pct > p1w.pct) weekWinner = p2?.playerName ?? 'P2';
        else                         weekWinner = 'Tie';
      } else if (p1w.pct !== null)   weekWinner = p1?.playerName ?? 'P1';
      else if   (p2w.pct !== null)   weekWinner = p2?.playerName ?? 'P2';

      return {
        week,
        dates:    weekDateRange(week),
        p1wPct:   p1w.pct,   p1wStr:   ratioLabel(p1w),
        p2wPct:   p2w.pct,   p2wStr:   ratioLabel(p2w),
        p1prePct: p1pre.pct, p1preStr: ratioLabel(p1pre),
        p2prePct: p2pre.pct, p2preStr: ratioLabel(p2pre),
        weekWinner,
      };
    });
  }, [picks, results, p1, p2]);

  const sortedWeeklyRows = useMemo(() => {
    const { col, dir } = weekSort;
    return [...weeklyRows].sort((a, b) => {
      const av = a[col] ?? (dir === 'asc' ? Infinity : -Infinity);
      const bv = b[col] ?? (dir === 'asc' ? Infinity : -Infinity);
      if (typeof av === 'string') return dir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
      return dir === 'asc' ? av - bv : bv - av;
    });
  }, [weeklyRows, weekSort]);

  // ── 4e: Division splits ───────────────────────────────────────────────────
  const divRows = useMemo(() => {
    return DIVISION_ORDER.map(div => ({
      div,
      p1w: p1 ? divisionAccuracy(picks, results, p1.playerId, div, SCHEDULE, 'weekly')    : null,
      p2w: p2 ? divisionAccuracy(picks, results, p2.playerId, div, SCHEDULE, 'weekly')    : null,
      p1p: p1 ? divisionAccuracy(picks, results, p1.playerId, div, SCHEDULE, 'preseason') : null,
      p2p: p2 ? divisionAccuracy(picks, results, p2.playerId, div, SCHEDULE, 'preseason') : null,
    }));
  }, [picks, results, p1, p2]);

  // ── 4f: O/U tracker ──────────────────────────────────────────────────────
  const p1Predicted = useMemo(() => p1 ? predictedWinsFromPicks(picks, p1.playerId, SCHEDULE) : {}, [picks, p1]);
  const p2Predicted = useMemo(() => p2 ? predictedWinsFromPicks(picks, p2.playerId, SCHEDULE) : {}, [picks, p2]);

  const ouRows = useMemo(() => {
    return TEAM_IDS
      .map(teamId => {
        const line    = ouLines[teamId] ?? null;
        const pace    = ouPace(results, SCHEDULE, teamId);
        const p1pred  = p1Predicted[teamId] ?? 0;
        const p2pred  = p2Predicted[teamId] ?? 0;
        const p1stat  = ouStatus(p1pred, line);
        const p2stat  = ouStatus(p2pred, line);
        const isClose = line !== null && pace.projected !== null && Math.abs(pace.projected - line) <= 0.5;
        return { teamId, line, p1pred, p2pred, pace, p1stat, p2stat, isClose };
      })
      .sort((a, b) => {
        if (a.line === null && b.line === null) return 0;
        if (a.line === null) return 1;
        if (b.line === null) return -1;
        return b.line - a.line;
      });
  }, [results, ouLines, p1Predicted, p2Predicted]);

  // ── 4g: Upset tracker ────────────────────────────────────────────────────
  const upsets = useMemo(() => upsetGames(results, SCHEDULE), [results]);

  const upsetRows = useMemo(() => {
    const p1WeeklyMap = {}, p2WeeklyMap = {}, p1PreMap = {}, p2PreMap = {};
    for (const doc of picks) {
      if (p1 && doc.playerId === p1.playerId) {
        if (doc.type.startsWith('week_')) Object.assign(p1WeeklyMap, doc.picks ?? {});
        if (doc.type === 'preseason')      Object.assign(p1PreMap,   doc.picks ?? {});
      }
      if (p2 && doc.playerId === p2.playerId) {
        if (doc.type.startsWith('week_')) Object.assign(p2WeeklyMap, doc.picks ?? {});
        if (doc.type === 'preseason')      Object.assign(p2PreMap,   doc.picks ?? {});
      }
    }
    return upsets.map(({ gameId, week, winner, game }) => ({
      gameId, week, winner,
      away: TEAMS[game.awayTeam]?.abbr ?? game.awayTeam,
      home: TEAMS[game.homeTeam]?.abbr ?? game.homeTeam,
      p1WeeklyCalled: p1WeeklyMap[gameId] === winner,
      p1WeeklyPicked: p1WeeklyMap[gameId] !== undefined,
      p1PreCalled:    p1PreMap[gameId]    === winner,
      p1PrePicked:    p1PreMap[gameId]    !== undefined,
      p2WeeklyCalled: p2WeeklyMap[gameId] === winner,
      p2WeeklyPicked: p2WeeklyMap[gameId] !== undefined,
      p2PreCalled:    p2PreMap[gameId]    === winner,
      p2PrePicked:    p2PreMap[gameId]    !== undefined,
    }));
  }, [upsets, picks, p1, p2]);

  // ── Render helpers ────────────────────────────────────────────────────────

  function h2hHeadline() {
    if (!h2hRecord || !p1 || !p2) return '—';
    const { p1Wins, p2Wins, ties } = h2hRecord;
    if (p1Wins > p2Wins) return `${p1.playerName} leads ${p1Wins}–${p2Wins}–${ties}`;
    if (p2Wins > p1Wins) return `${p2.playerName} leads ${p2Wins}–${p1Wins}–${ties}`;
    return `Tied ${p1Wins}–${p2Wins}–${ties}`;
  }

  function upsetCell(picked, called) {
    if (!picked) return { cls: 'cell--muted', label: '—' };
    return called
      ? { cls: 'cell--success', label: '✓' }
      : { cls: 'cell--error',   label: '✗' };
  }

  // ── Loading / empty states ────────────────────────────────────────────────

  if (loading) {
    return <div className="page"><p className="placeholder-note">Loading…</p></div>;
  }

  if (!p1) {
    return (
      <div className="page">
        <h1>Dashboard</h1>
        <p className="placeholder-note">No players registered yet. Open the app on both devices to get started.</p>
      </div>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────

  const p1Name = p1?.playerName ?? 'P1';
  const p2Name = p2?.playerName ?? 'P2';

  return (
    <div className="page">
      <h1>Dashboard</h1>

      {/* ── 4a: Head-to-Head Summary ── */}
      <section className="dash-section">
        <h2>Head-to-Head</h2>
        <div className="h2h-layout">
          <PlayerCard player={p1} weeklyAcc={p1WeeklyAcc} preAcc={p1PreAcc} streak={p1Streak} />
          <div className="h2h-center">
            <div className="h2h-headline">{h2hHeadline()}</div>
            <div className="h2h-sub">week-by-week record</div>
          </div>
          <PlayerCard player={p2} weeklyAcc={p2WeeklyAcc} preAcc={p2PreAcc} streak={p2Streak} />
        </div>

        {h2hWeekly.length > 0 && (
          <div className="dash-table-wrap" style={{ marginTop: 'var(--space-md)' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Week</th>
                  <th>{p1Name} W/L</th>
                  <th>{p2Name} W/L</th>
                  <th>Week Winner</th>
                </tr>
              </thead>
              <tbody>
                {h2hWeekly.map(({ week, p1: w1, p2: w2, winner }) => {
                  const winnerName =
                    winner === p1?.playerId ? p1Name :
                    winner === p2?.playerId ? p2Name :
                    winner === 'tie'        ? 'Tie'  : '—';
                  const winnerCls =
                    winner === p1?.playerId ? 'cell--p1' :
                    winner === p2?.playerId ? 'cell--p2' :
                    winner === 'tie'        ? 'cell--muted' : '';
                  return (
                    <tr key={week}>
                      <td>{week}</td>
                      <td>{w1.total ? `${w1.correct}/${w1.total}` : '—'}</td>
                      <td>{w2.total ? `${w2.correct}/${w2.total}` : '—'}</td>
                      <td className={winnerCls}>{winnerName}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ── 4b: Accuracy At A Glance ── */}
      <section className="dash-section">
        <h2>Accuracy At A Glance</h2>
        <div className="stat-cards-grid">
          <StatCard
            label={`${p1Name} Weekly`}
            value={fmtPct(p1WeeklyAcc?.pct)}
            accent
            sub={p1WeeklyAcc?.total ? ratioLabel(p1WeeklyAcc) : undefined}
          />
          <StatCard
            label={`${p2Name} Weekly`}
            value={fmtPct(p2WeeklyAcc?.pct)}
            accent
            sub={p2WeeklyAcc?.total ? ratioLabel(p2WeeklyAcc) : undefined}
          />
          <StatCard
            label={`${p1Name} Pre-Season`}
            value={fmtPct(p1PreAcc?.pct)}
            sub={p1PreAcc?.total ? ratioLabel(p1PreAcc) : undefined}
          />
          <StatCard
            label={`${p2Name} Pre-Season`}
            value={fmtPct(p2PreAcc?.pct)}
            sub={p2PreAcc?.total ? ratioLabel(p2PreAcc) : undefined}
          />
          <StatCard
            label={`${p1Name} O/U Rate`}
            value={fmtPct(p1OuAcc?.pct)}
            sub={p1OuAcc ? `${p1OuAcc.correct}/${p1OuAcc.total} decided` : 'No lines set'}
          />
          <StatCard
            label={`${p2Name} O/U Rate`}
            value={fmtPct(p2OuAcc?.pct)}
            sub={p2OuAcc ? `${p2OuAcc.correct}/${p2OuAcc.total} decided` : 'No lines set'}
          />
          <StatCard label="Games Decided"   value={decided}   />
          <StatCard label="Games Remaining" value={remaining} />
        </div>
      </section>

      {/* ── 4c: Weekly Accuracy Table ── */}
      <section className="dash-section">
        <h2>Weekly Accuracy</h2>
        <div className="dash-table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <SortableTh col="week"     sort={weekSort} onSort={setWeekSort}>Wk</SortableTh>
                <SortableTh col="dates"    sort={weekSort} onSort={setWeekSort}>Dates</SortableTh>
                <SortableTh col="p1wPct"   sort={weekSort} onSort={setWeekSort}>{p1Name} Weekly</SortableTh>
                <SortableTh col="p2wPct"   sort={weekSort} onSort={setWeekSort}>{p2Name} Weekly</SortableTh>
                <SortableTh col="p1prePct" sort={weekSort} onSort={setWeekSort}>{p1Name} Pre</SortableTh>
                <SortableTh col="p2prePct" sort={weekSort} onSort={setWeekSort}>{p2Name} Pre</SortableTh>
                <SortableTh col="weekWinner" sort={weekSort} onSort={setWeekSort}>Winner</SortableTh>
              </tr>
            </thead>
            <tbody>
              {sortedWeeklyRows.map(row => (
                <tr key={row.week}>
                  <td>{row.week}</td>
                  <td className="cell--muted">{row.dates}</td>
                  <td>
                    {row.p1wStr}
                    {row.p1wPct !== null && <span className="cell-pct"> ({fmtPct(row.p1wPct)})</span>}
                  </td>
                  <td>
                    {row.p2wStr}
                    {row.p2wPct !== null && <span className="cell-pct"> ({fmtPct(row.p2wPct)})</span>}
                  </td>
                  <td>
                    {row.p1preStr}
                    {row.p1prePct !== null && <span className="cell-pct"> ({fmtPct(row.p1prePct)})</span>}
                  </td>
                  <td>
                    {row.p2preStr}
                    {row.p2prePct !== null && <span className="cell-pct"> ({fmtPct(row.p2prePct)})</span>}
                  </td>
                  <td className={
                    !row.weekWinner ? '' :
                    row.weekWinner === p1Name ? 'cell--p1' :
                    row.weekWinner === p2Name ? 'cell--p2' :
                    'cell--muted'
                  }>
                    {row.weekWinner ?? '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* ── 4d: Rolling Stats ── */}
      <section className="dash-section">
        <h2>Rolling Stats</h2>
        <div className="rolling-grid">
          {[
            {
              label: p1Name,
              rolling: p1Rolling,
              bestWorst: p1BestWorst,
              streak: p1Streak,
              longestOk: p1LongestOk,
              longestErr: p1LongestErr,
            },
            p2 ? {
              label: p2Name,
              rolling: p2Rolling,
              bestWorst: p2BestWorst,
              streak: p2Streak,
              longestOk: p2LongestOk,
              longestErr: p2LongestErr,
            } : null,
          ].filter(Boolean).map(({ label, rolling, bestWorst, streak, longestOk, longestErr }) => (
            <div key={label} className="rolling-card">
              <div className="rolling-card__name">{label}</div>
              <div className="rolling-stat">
                <span className="rolling-stat__label">Last 4 Weeks</span>
                <span className="rolling-stat__value">{fmtPct(rolling?.pct)}</span>
              </div>
              <div className="rolling-stat">
                <span className="rolling-stat__label">Best Week</span>
                <span className="rolling-stat__value">
                  {bestWorst?.best ? `Wk ${bestWorst.best.week} (${fmtPct(bestWorst.best.pct)})` : '—'}
                </span>
              </div>
              <div className="rolling-stat">
                <span className="rolling-stat__label">Worst Week</span>
                <span className="rolling-stat__value">
                  {bestWorst?.worst ? `Wk ${bestWorst.worst.week} (${fmtPct(bestWorst.worst.pct)})` : '—'}
                </span>
              </div>
              <div className="rolling-stat">
                <span className="rolling-stat__label">Current Streak</span>
                <span className="rolling-stat__value">
                  {streak?.count && streak?.type ? `${streak.count} ${streak.type}` : '—'}
                </span>
              </div>
              <div className="rolling-stat">
                <span className="rolling-stat__label">Longest Correct Run</span>
                <span className="rolling-stat__value">{longestOk || '—'}</span>
              </div>
              <div className="rolling-stat">
                <span className="rolling-stat__label">Longest Wrong Run</span>
                <span className="rolling-stat__value">{longestErr || '—'}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── 4e: Conference & Division Splits ── */}
      <section className="dash-section">
        <h2>Conference &amp; Division Splits</h2>
        <div className="split-grid">
          {['AFC', 'NFC'].map(conf => (
            <div key={conf}>
              <div className="split-conf-header">{conf}</div>
              <div className="dash-table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Division</th>
                      <th>{p1Name} Weekly</th>
                      <th>{p2Name} Weekly</th>
                      <th>{p1Name} Pre</th>
                      <th>{p2Name} Pre</th>
                    </tr>
                  </thead>
                  <tbody>
                    {divRows.filter(r => r.div.startsWith(conf)).map(({ div, p1w, p2w, p1p, p2p }) => (
                      <tr key={div}>
                        <td>{div.replace(`${conf} `, '')}</td>
                        <td>{p1w?.total ? `${p1w.correct}/${p1w.total} (${fmtPct(p1w.pct)})` : '—'}</td>
                        <td>{p2w?.total ? `${p2w.correct}/${p2w.total} (${fmtPct(p2w.pct)})` : '—'}</td>
                        <td>{p1p?.total ? `${p1p.correct}/${p1p.total} (${fmtPct(p1p.pct)})` : '—'}</td>
                        <td>{p2p?.total ? `${p2p.correct}/${p2p.total} (${fmtPct(p2p.pct)})` : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── 4f: O/U Tracker ── */}
      <section className="dash-section">
        <h2>O/U Tracker</h2>
        {!Object.keys(ouLines).length ? (
          <p className="placeholder-note">No O/U lines set yet. Enter them on the Results screen.</p>
        ) : (
          <div className="dash-table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Team</th>
                  <th>O/U Line</th>
                  <th>{p1Name} Pred.</th>
                  <th>{p2Name} Pred.</th>
                  <th>Actual W</th>
                  <th>Projected</th>
                  <th>{p1Name}</th>
                  <th>{p2Name}</th>
                </tr>
              </thead>
              <tbody>
                {ouRows.map(({ teamId, line, p1pred, p2pred, pace, p1stat, p2stat, isClose }) => (
                  <tr key={teamId} className={isClose ? 'ou-close-call' : ''}>
                    <td>{TEAMS[teamId]?.name ?? teamId}</td>
                    <td>{line ?? '—'}</td>
                    <td>{p1pred}</td>
                    <td>{p2pred}</td>
                    <td>{pace.played > 0 ? `${pace.wins}/${pace.played}` : '—'}</td>
                    <td>{pace.projected ?? '—'}</td>
                    <td className={ouStatusClass(p1stat)}>{ouStatusLabel(p1stat)}</td>
                    <td className={ouStatusClass(p2stat)}>{ouStatusLabel(p2stat)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ── 4g: Upset Tracker ── */}
      <section className="dash-section">
        <h2>Upset Tracker</h2>
        <p className="text-muted dash-section__note">
          Upset = away team wins. {upsetRows.length} upset{upsetRows.length !== 1 ? 's' : ''} so far this season.
        </p>
        {upsetRows.length === 0 ? (
          <p className="placeholder-note">No upsets recorded yet.</p>
        ) : (
          <div className="dash-table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Game</th>
                  <th>Wk</th>
                  <th>Winner</th>
                  <th>{p1Name} Weekly</th>
                  <th>{p1Name} Pre</th>
                  <th>{p2Name} Weekly</th>
                  <th>{p2Name} Pre</th>
                </tr>
              </thead>
              <tbody>
                {upsetRows.map(row => {
                  const p1w = upsetCell(row.p1WeeklyPicked, row.p1WeeklyCalled);
                  const p1p = upsetCell(row.p1PrePicked,    row.p1PreCalled);
                  const p2w = upsetCell(row.p2WeeklyPicked, row.p2WeeklyCalled);
                  const p2p = upsetCell(row.p2PrePicked,    row.p2PreCalled);
                  return (
                    <tr key={row.gameId}>
                      <td>{row.away} @ {row.home}</td>
                      <td>{row.week}</td>
                      <td>{TEAMS[row.winner]?.abbr ?? row.winner}</td>
                      <td className={p1w.cls}>{p1w.label}</td>
                      <td className={p1p.cls}>{p1p.label}</td>
                      <td className={p2w.cls}>{p2w.label}</td>
                      <td className={p2p.cls}>{p2p.label}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
