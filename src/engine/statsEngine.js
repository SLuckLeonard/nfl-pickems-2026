// Phase 3: Stats engine — pure functions only, no Firestore, no side effects.
// React components call Firestore to get data, then pass it to these functions.

// TODO: Replace away-team-wins upset definition with record-based definition after Week 4.
// See NFL_PICKEMS_MASTER_SPEC.md for full details.

// export function weeklyAccuracy(picks, results, playerId, week) { ... }
// export function overallAccuracy(picks, results, playerId, pickType) { ... }
// export function rollingAccuracy(picks, results, playerId, currentWeek, windowSize = 4) { ... }
// export function currentStreak(picks, results, playerId, pickType) { ... }
// export function headToHeadWeekly(picks, results, player1Id, player2Id) { ... }
// export function headToHeadRecord(picks, results, player1Id, player2Id) { ... }
// export function conferenceAccuracy(picks, results, playerId, conf, schedule) { ... }
// export function divisionAccuracy(picks, results, playerId, div, schedule) { ... }
// export function upsetGames(results, schedule) { ... }
// export function upsetPickAccuracy(picks, results, playerId, schedule) { ... }
// export function predictedWinsFromPicks(picks, playerId, schedule) { ... }
// export function ouPace(results, schedule, teamId) { ... }
// export function ouStatus(predictedWins, ouLine) { ... }  returns "over" | "under" | "push"
// export function ouTrendingAccuracy(picks, results, ouLines, playerId, schedule) { ... }
// export function bestAndWorstWeek(picks, results, playerId, pickType) { ... }
// export function gamesDecided(results) { ... }
// export function gamesRemaining(results, schedule) { ... }
