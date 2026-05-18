import { useMemo } from 'react';
import {
  LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer,
} from 'recharts';
import { useResults, useAllPicks, useSeasonConfig, usePlayers } from '../hooks/useFirestore.js';
import { SCHEDULE } from '../data/schedule2026.js';
import { TEAMS } from '../data/teams.js';
import {
  weeklyAccuracy,
  divisionAccuracy,
  predictedWinsFromPicks,
  ouPace,
  ouTrendingAccuracy,
} from '../engine/statsEngine.js';
import '../styles/charts.css';

// ── Palette (mirrors main.css design tokens as literals for Recharts) ──────

const P = {
  p1:      '#00d4ff',  // accent cyan
  p2:      '#f59e0b',  // warning amber
  p1pre:   '#0891b2',  // darker cyan (pre-season)
  p2pre:   '#b45309',  // darker amber (pre-season)
  correct: '#22c55e',
  error:   '#ef4444',
  neutral: '#555555',
  ouMark:  'rgba(240,240,240,0.2)',
  grid:    '#2e2e2e',
  text:    '#888888',
};

// ── Static data ────────────────────────────────────────────────────────────

const DIV_ORDER = [
  'AFC East', 'AFC North', 'AFC South', 'AFC West',
  'NFC East', 'NFC North', 'NFC South', 'NFC West',
];

const DIV_ABBR = {
  'AFC East': 'AFC E', 'AFC North': 'AFC N', 'AFC South': 'AFC S', 'AFC West': 'AFC W',
  'NFC East': 'NFC E', 'NFC North': 'NFC N', 'NFC South': 'NFC S', 'NFC West': 'NFC W',
};

const TEAM_IDS = Object.keys(TEAMS);

// ── Pure helpers ────────────────────────────────────────────────────────────

// Convert 0–1 fraction to a 0–100 percentage (1 decimal, avoids float drift)
function toPct(val) {
  if (val === null || val === undefined) return null;
  return Math.round(val * 1000) / 10;
}

// Preseason pick accuracy for a specific week's games (mirrors Dashboard helper)
function preSeasonWeekAcc(allPicks, results, playerId, week) {
  const doc = allPicks.find(p => p.playerId === playerId && p.type === 'preseason');
  if (!doc) return { pct: null };
  const picksMap = doc.picks ?? {};
  const weekGames = Object.fromEntries(
    Object.entries(results?.games ?? {}).filter(([id]) => {
      const m = id.match(/_W(\d+)_/);
      return m && parseInt(m[1], 10) === week;
    })
  );
  let correct = 0, total = 0;
  for (const [gameId, result] of Object.entries(weekGames)) {
    if (picksMap[gameId] === undefined) continue;
    total++;
    if (picksMap[gameId] === result) correct++;
  }
  return { pct: total > 0 ? correct / total : null };
}

// Shared Recharts axis/grid props for the dark theme
const tickStyle = { fill: P.text, fontSize: 11, fontFamily: "'Roboto Mono', monospace" };
const gridProps  = { strokeDasharray: '3 3', stroke: P.grid };
const pctFmt     = v => `${v}%`;

// ── Sub-components ──────────────────────────────────────────────────────────

function DarkTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="chart-tooltip">
      <p className="chart-tooltip__label">{label}</p>
      {payload.map((entry, i) => (
        <p key={i} className="chart-tooltip__item" style={{ color: entry.color ?? entry.fill }}>
          {entry.name}:{' '}
          {entry.value != null
            ? (typeof entry.value === 'number' ? `${entry.value.toFixed(1)}%` : entry.value)
            : '—'}
        </p>
      ))}
    </div>
  );
}

function CountTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="chart-tooltip">
      <p className="chart-tooltip__label">{label}</p>
      {payload.map((entry, i) => (
        <p key={i} className="chart-tooltip__item" style={{ color: entry.fill }}>
          {entry.name}: {entry.value} teams
        </p>
      ))}
    </div>
  );
}

function EmptyChart({ message }) {
  return <p className="chart-empty">{message}</p>;
}

// ── Main component ──────────────────────────────────────────────────────────

export default function Charts() {
  const { results, loading: rLoading } = useResults();
  const { picks,   loading: pLoading } = useAllPicks();
  const { config,  loading: cLoading } = useSeasonConfig();
  const { players, loading: plLoading } = usePlayers();

  const loading = rLoading || pLoading || cLoading || plLoading;

  // Sort players by registration time for stable p1/p2 assignment
  const [p1, p2] = useMemo(() => {
    const sorted = [...players].sort((a, b) => {
      const at = a.createdAt?.toMillis?.() ?? 0;
      const bt = b.createdAt?.toMillis?.() ?? 0;
      return at - bt;
    });
    return [sorted[0] ?? null, sorted[1] ?? null];
  }, [players]);

  const p1Name  = p1?.playerName ?? 'P1';
  const p2Name  = p2?.playerName ?? 'P2';
  const ouLines = config?.ouLines ?? {};
  const hasLines = Object.keys(ouLines).length > 0;

  // Weeks that have at least one result entered, ascending
  const weeksWithResults = useMemo(() => {
    const weeks = new Set();
    for (const gameId of Object.keys(results?.games ?? {})) {
      const m = gameId.match(/_W(\d+)_/);
      if (m) weeks.add(parseInt(m[1], 10));
    }
    return [...weeks].sort((a, b) => a - b);
  }, [results]);

  const noResults = weeksWithResults.length === 0;

  // ── Charts 1 & 2: per-week accuracy (weekly + preseason) ─────────────────
  const weeklyData = useMemo(() => {
    return weeksWithResults.map(week => {
      const p1w  = p1 ? weeklyAccuracy(picks, results, p1.playerId, week)     : { pct: null };
      const p2w  = p2 ? weeklyAccuracy(picks, results, p2.playerId, week)     : { pct: null };
      const p1pr = p1 ? preSeasonWeekAcc(picks, results, p1.playerId, week)   : { pct: null };
      const p2pr = p2 ? preSeasonWeekAcc(picks, results, p2.playerId, week)   : { pct: null };
      return {
        week:     `Wk ${week}`,
        p1Weekly: toPct(p1w.pct),
        p2Weekly: toPct(p2w.pct),
        p1Pre:    toPct(p1pr.pct),
        p2Pre:    toPct(p2pr.pct),
      };
    });
  }, [weeksWithResults, picks, results, p1, p2]);

  // ── Chart 3: cumulative weekly accuracy ──────────────────────────────────
  const cumulativeData = useMemo(() => {
    let p1c = 0, p1t = 0, p2c = 0, p2t = 0;
    return weeksWithResults.map(week => {
      const p1w = p1 ? weeklyAccuracy(picks, results, p1.playerId, week) : { correct: 0, total: 0 };
      const p2w = p2 ? weeklyAccuracy(picks, results, p2.playerId, week) : { correct: 0, total: 0 };
      p1c += p1w.correct; p1t += p1w.total;
      p2c += p2w.correct; p2t += p2w.total;
      return {
        week: `Wk ${week}`,
        p1: p1t > 0 ? toPct(p1c / p1t) : null,
        p2: p2t > 0 ? toPct(p2c / p2t) : null,
      };
    });
  }, [weeksWithResults, picks, results, p1, p2]);

  // ── Chart 4: division accuracy ────────────────────────────────────────────
  const divData = useMemo(() => {
    return DIV_ORDER.map(div => ({
      div:  DIV_ABBR[div],
      p1w:  p1 ? toPct(divisionAccuracy(picks, results, p1.playerId, div, SCHEDULE, 'weekly').pct)    : null,
      p2w:  p2 ? toPct(divisionAccuracy(picks, results, p2.playerId, div, SCHEDULE, 'weekly').pct)    : null,
      p1p:  p1 ? toPct(divisionAccuracy(picks, results, p1.playerId, div, SCHEDULE, 'preseason').pct) : null,
      p2p:  p2 ? toPct(divisionAccuracy(picks, results, p2.playerId, div, SCHEDULE, 'preseason').pct) : null,
    }));
  }, [picks, results, p1, p2]);

  // ── Charts 5 & 5b: O/U hit rate bars + per-team status chips ─────────────
  const [ouBarData, ouTeamChips] = useMemo(() => {
    if (!hasLines) return [[], null];
    const p1acc = p1 ? ouTrendingAccuracy(picks, results, ouLines, p1.playerId, SCHEDULE) : null;
    const p2acc = p2 ? ouTrendingAccuracy(picks, results, ouLines, p2.playerId, SCHEDULE) : null;

    const bars = [
      p1acc && { name: p1Name, correct: p1acc.correct, incorrect: p1acc.incorrect, tooEarly: p1acc.tooEarly },
      p2acc && { name: p2Name, correct: p2acc.correct, incorrect: p2acc.incorrect, tooEarly: p2acc.tooEarly },
    ].filter(Boolean);

    const chips = TEAM_IDS.map(teamId => ({
      teamId,
      abbr:     TEAMS[teamId].abbr,
      p1Status: p1acc?.details?.[teamId]?.status ?? null,
      p2Status: p2acc?.details?.[teamId]?.status ?? null,
    }));

    return [bars, chips];
  }, [hasLines, picks, results, ouLines, p1, p2, p1Name, p2Name]);

  // ── Chart 6: team win pace ────────────────────────────────────────────────
  const p1Pred = useMemo(() => p1 ? predictedWinsFromPicks(picks, p1.playerId, SCHEDULE) : {}, [picks, p1]);
  const p2Pred = useMemo(() => p2 ? predictedWinsFromPicks(picks, p2.playerId, SCHEDULE) : {}, [picks, p2]);

  const winPaceData = useMemo(() => {
    return TEAM_IDS
      .filter(id => ouLines[id] != null)
      .map(teamId => ({
        abbr:   TEAMS[teamId].abbr,
        ouLine: ouLines[teamId],
        p1pred: p1Pred[teamId] ?? 0,
        p2pred: p2Pred[teamId] ?? 0,
        actual: ouPace(results, SCHEDULE, teamId).wins,
      }))
      .sort((a, b) => b.ouLine - a.ouLine);
  }, [results, ouLines, p1Pred, p2Pred]);

  // ── Early states ──────────────────────────────────────────────────────────

  if (loading) {
    return <div className="page"><p className="placeholder-note">Loading…</p></div>;
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="page">
      <h1>Charts</h1>

      {/* ── Chart 1: Weekly Accuracy Line ── */}
      <section className="chart-section">
        <h2>Weekly Accuracy</h2>
        <p className="chart-section__desc text-muted">
          Pick accuracy per week for weekly picks only. Hover for details.
        </p>
        {noResults ? <EmptyChart message="No results entered yet." /> : (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={weeklyData} margin={{ top: 8, right: 24, bottom: 8, left: 0 }}>
              <CartesianGrid {...gridProps} />
              <XAxis dataKey="week" tick={tickStyle} />
              <YAxis domain={[0, 100]} tickFormatter={pctFmt} tick={tickStyle} width={40} />
              <Tooltip content={<DarkTooltip />} />
              <Legend wrapperStyle={{ fontSize: 12, color: P.text }} />
              <Line
                type="monotone" dataKey="p1Weekly" name={`${p1Name} Weekly`}
                stroke={P.p1} strokeWidth={2}
                dot={{ r: 3, fill: P.p1 }} activeDot={{ r: 5 }}
                connectNulls={false}
              />
              <Line
                type="monotone" dataKey="p2Weekly" name={`${p2Name} Weekly`}
                stroke={P.p2} strokeWidth={2}
                dot={{ r: 3, fill: P.p2 }} activeDot={{ r: 5 }}
                connectNulls={false}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </section>

      {/* ── Chart 2: Pre-Season vs Weekly Comparison ── */}
      <section className="chart-section">
        <h2>Pre-Season vs Weekly Accuracy</h2>
        <p className="chart-section__desc text-muted">
          Grouped bars per week — lighter shades are pre-season picks, brighter shades are weekly picks.
        </p>
        {noResults ? <EmptyChart message="No results entered yet." /> : (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart
              data={weeklyData}
              barGap={2}
              barCategoryGap="22%"
              margin={{ top: 8, right: 24, bottom: 8, left: 0 }}
            >
              <CartesianGrid {...gridProps} />
              <XAxis dataKey="week" tick={tickStyle} />
              <YAxis domain={[0, 100]} tickFormatter={pctFmt} tick={tickStyle} width={40} />
              <Tooltip content={<DarkTooltip />} />
              <Legend wrapperStyle={{ fontSize: 12, color: P.text }} />
              <Bar dataKey="p1Pre"    name={`${p1Name} Pre`}    fill={P.p1pre} barSize={7} />
              <Bar dataKey="p1Weekly" name={`${p1Name} Weekly`} fill={P.p1}    barSize={7} />
              <Bar dataKey="p2Pre"    name={`${p2Name} Pre`}    fill={P.p2pre} barSize={7} />
              <Bar dataKey="p2Weekly" name={`${p2Name} Weekly`} fill={P.p2}    barSize={7} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </section>

      {/* ── Chart 3: Cumulative Accuracy ── */}
      <section className="chart-section">
        <h2>Cumulative Accuracy</h2>
        <p className="chart-section__desc text-muted">
          Running weekly pick accuracy across all completed weeks.
        </p>
        {noResults ? <EmptyChart message="No results entered yet." /> : (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={cumulativeData} margin={{ top: 8, right: 24, bottom: 8, left: 0 }}>
              <CartesianGrid {...gridProps} />
              <XAxis dataKey="week" tick={tickStyle} />
              <YAxis domain={[0, 100]} tickFormatter={pctFmt} tick={tickStyle} width={40} />
              <Tooltip content={<DarkTooltip />} />
              <Legend wrapperStyle={{ fontSize: 12, color: P.text }} />
              <Line
                type="monotone" dataKey="p1" name={p1Name}
                stroke={P.p1} strokeWidth={2}
                dot={{ r: 3, fill: P.p1 }} activeDot={{ r: 5 }}
              />
              <Line
                type="monotone" dataKey="p2" name={p2Name}
                stroke={P.p2} strokeWidth={2}
                dot={{ r: 3, fill: P.p2 }} activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </section>

      {/* ── Chart 4: Division Accuracy ── */}
      <section className="chart-section">
        <h2>Division Accuracy</h2>
        <p className="chart-section__desc text-muted">
          Pick accuracy split by division (home team's division) — weekly and pre-season side by side.
        </p>
        {noResults ? <EmptyChart message="No results entered yet." /> : (
          <div className="chart-pair">
            <div>
              <p className="chart-sublabel">Weekly</p>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart
                  layout="vertical" data={divData}
                  margin={{ top: 4, right: 36, bottom: 4, left: 4 }}
                >
                  <CartesianGrid {...gridProps} />
                  <YAxis type="category" dataKey="div" tick={tickStyle} width={48} />
                  <XAxis type="number" domain={[0, 100]} tickFormatter={pctFmt} tick={tickStyle} />
                  <Tooltip content={<DarkTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 12, color: P.text }} />
                  <Bar dataKey="p1w" name={p1Name} fill={P.p1} barSize={10} />
                  <Bar dataKey="p2w" name={p2Name} fill={P.p2} barSize={10} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div>
              <p className="chart-sublabel">Pre-Season</p>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart
                  layout="vertical" data={divData}
                  margin={{ top: 4, right: 36, bottom: 4, left: 4 }}
                >
                  <CartesianGrid {...gridProps} />
                  <YAxis type="category" dataKey="div" tick={tickStyle} width={48} />
                  <XAxis type="number" domain={[0, 100]} tickFormatter={pctFmt} tick={tickStyle} />
                  <Tooltip content={<DarkTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 12, color: P.text }} />
                  <Bar dataKey="p1p" name={p1Name} fill={P.p1pre} barSize={10} />
                  <Bar dataKey="p2p" name={p2Name} fill={P.p2pre} barSize={10} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </section>

      {/* ── Chart 5: O/U Hit Rate ── */}
      <section className="chart-section">
        <h2>O/U Hit Rate</h2>
        <p className="chart-section__desc text-muted">
          How many of each player's win total predictions are trending correct (green), wrong (red), or too early to tell (gray).
          Chips below show per-team status.
        </p>
        {!hasLines ? (
          <EmptyChart message="No O/U lines set yet. Enter them on the Results screen." />
        ) : (
          <>
            <ResponsiveContainer width="100%" height={Math.max(120, ouBarData.length * 56 + 56)}>
              <BarChart
                layout="vertical" data={ouBarData}
                margin={{ top: 8, right: 24, bottom: 8, left: 4 }}
              >
                <XAxis type="number" domain={[0, 32]} tick={tickStyle} />
                <YAxis type="category" dataKey="name" tick={tickStyle} width={64} />
                <Tooltip content={<CountTooltip />} />
                <Legend wrapperStyle={{ fontSize: 12, color: P.text }} />
                <Bar dataKey="correct"   name="Correct"   stackId="a" fill={P.correct} />
                <Bar dataKey="incorrect" name="Incorrect" stackId="a" fill={P.error} />
                <Bar dataKey="tooEarly"  name="Too Early" stackId="a" fill={P.neutral} />
              </BarChart>
            </ResponsiveContainer>

            {ouTeamChips && (
              <div className="ou-team-grids">
                {[
                  { label: p1Name, key: 'p1Status' },
                  ...(p2 ? [{ label: p2Name, key: 'p2Status' }] : []),
                ].map(({ label, key }) => (
                  <div key={label} className="ou-team-grid">
                    <div className="ou-team-grid__label">{label}</div>
                    <div className="ou-team-grid__chips">
                      {ouTeamChips.map(({ teamId, abbr, p1Status, p2Status }) => {
                        const status = key === 'p1Status' ? p1Status : p2Status;
                        const cls =
                          status === 'correct'   ? 'ou-chip--correct' :
                          status === 'incorrect' ? 'ou-chip--error'   :
                          'ou-chip--neutral';
                        return (
                          <span
                            key={teamId}
                            className={`ou-chip ${cls}`}
                            title={TEAMS[teamId]?.name}
                          >
                            {abbr}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </section>

      {/* ── Chart 6: Team Win Pace ── */}
      <section className="chart-section">
        <h2>Team Win Pace</h2>
        <p className="chart-section__desc text-muted">
          Predicted wins (P1 and P2) vs actual wins so far per team.
          Faint bar = O/U line reference. Sorted highest O/U first.
        </p>
        {!hasLines ? (
          <EmptyChart message="No O/U lines set yet." />
        ) : winPaceData.length === 0 ? (
          <EmptyChart message="No teams with O/U lines set." />
        ) : (
          <ResponsiveContainer width="100%" height={Math.max(300, winPaceData.length * 40 + 56)}>
            <BarChart
              layout="vertical" data={winPaceData}
              margin={{ top: 8, right: 48, bottom: 8, left: 8 }}
            >
              <CartesianGrid {...gridProps} />
              <YAxis type="category" dataKey="abbr" tick={tickStyle} width={36} />
              <XAxis type="number" domain={[0, 17]} tickCount={10} tick={tickStyle} />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (!active || !payload?.length) return null;
                  const row = winPaceData.find(d => d.abbr === label);
                  return (
                    <div className="chart-tooltip">
                      <p className="chart-tooltip__label">{label}</p>
                      <p className="chart-tooltip__item" style={{ color: P.text }}>
                        O/U Line: {row?.ouLine ?? '—'}
                      </p>
                      {payload
                        .filter(p => p.dataKey !== 'ouLine')
                        .map((p, i) => (
                          <p key={i} className="chart-tooltip__item" style={{ color: p.fill }}>
                            {p.name}: {p.value}
                          </p>
                        ))}
                    </div>
                  );
                }}
              />
              <Legend wrapperStyle={{ fontSize: 12, color: P.text }} />
              <Bar dataKey="ouLine" name="O/U Line"             fill={P.ouMark} barSize={6} />
              <Bar dataKey="p1pred" name={`${p1Name} Predicted`} fill={P.p1}    barSize={6} />
              <Bar dataKey="p2pred" name={`${p2Name} Predicted`} fill={P.p2}    barSize={6} />
              <Bar dataKey="actual" name="Actual Wins"           fill={P.correct} barSize={6} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </section>
    </div>
  );
}
