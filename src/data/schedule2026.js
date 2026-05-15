// TODO: VERIFY ALL GAMES against https://www.nfl.com before the season.
// Week 1 games below are confirmed except where marked TODO.
// Weeks 2-18 are stubs — populate from the official NFL schedule.
// Run the app in dev mode: a console.warn fires if game count != 272.

export const SCHEDULE = [
  // ─── WEEK 1 ───────────────────────────────────────────────────────────────
  // Confirmed from NFL.com / CBS Sports, May 2026
  {
    gameId: '2026_W1_SEA_NE',
    week: 1,
    date: '2026-09-09',
    kickoff: '2026-09-09T20:20:00-04:00',
    homeTeam: 'SEA',
    awayTeam: 'NE',
    location: 'Lumen Field, Seattle, WA',
    isInternational: false,
    internationalCity: null,
    network: 'NBC',
  },
  {
    gameId: '2026_W1_LAR_SF',
    week: 1,
    date: '2026-09-10',
    kickoff: '2026-09-10T20:35:00-04:00',
    homeTeam: 'LAR',
    awayTeam: 'SF',
    location: 'Melbourne, Australia',
    isInternational: true,
    internationalCity: 'Melbourne',
    network: 'Netflix',
  },
  {
    gameId: '2026_W1_BUF_HOU',
    week: 1,
    date: '2026-09-13',
    kickoff: '2026-09-13T13:00:00-04:00',
    homeTeam: 'BUF',
    awayTeam: 'HOU',
    location: 'Highmark Stadium, Orchard Park, NY',
    isInternational: false,
    internationalCity: null,
    network: 'CBS',
  },
  {
    gameId: '2026_W1_NYJ_TEN',
    week: 1,
    date: '2026-09-13',
    kickoff: '2026-09-13T13:00:00-04:00',
    homeTeam: 'NYJ',
    awayTeam: 'TEN',
    location: 'MetLife Stadium, East Rutherford, NJ',
    isInternational: false,
    internationalCity: null,
    network: 'CBS',
  },
  {
    gameId: '2026_W1_BAL_IND',
    week: 1,
    date: '2026-09-13',
    kickoff: '2026-09-13T13:00:00-04:00',
    homeTeam: 'BAL',
    awayTeam: 'IND',
    location: 'M&T Bank Stadium, Baltimore, MD',
    isInternational: false,
    internationalCity: null,
    network: 'CBS',
  },
  {
    gameId: '2026_W1_TB_CIN',
    week: 1,
    date: '2026-09-13',
    kickoff: '2026-09-13T13:00:00-04:00',
    homeTeam: 'TB',
    awayTeam: 'CIN',
    location: 'Raymond James Stadium, Tampa, FL',
    isInternational: false,
    internationalCity: null,
    network: 'Fox',
  },
  {
    gameId: '2026_W1_CLE_JAX',
    week: 1,
    date: '2026-09-13',
    kickoff: '2026-09-13T13:00:00-04:00',
    homeTeam: 'CLE',
    awayTeam: 'JAX',
    location: 'Huntington Bank Field, Cleveland, OH',
    isInternational: false,
    internationalCity: null,
    network: 'CBS',
  },
  {
    gameId: '2026_W1_ATL_PIT',
    week: 1,
    date: '2026-09-13',
    kickoff: '2026-09-13T13:00:00-04:00',
    homeTeam: 'ATL',
    awayTeam: 'PIT',
    location: 'Mercedes-Benz Stadium, Atlanta, GA',
    isInternational: false,
    internationalCity: null,
    network: 'Fox',
  },
  {
    gameId: '2026_W1_CHI_CAR',
    week: 1,
    date: '2026-09-13',
    kickoff: '2026-09-13T13:00:00-04:00',
    homeTeam: 'CHI',
    awayTeam: 'CAR',
    location: 'Soldier Field, Chicago, IL',
    isInternational: false,
    internationalCity: null,
    network: 'Fox',
  },
  {
    gameId: '2026_W1_NO_DET',
    week: 1,
    date: '2026-09-13',
    kickoff: '2026-09-13T13:00:00-04:00',
    homeTeam: 'NO',
    awayTeam: 'DET',
    location: 'Caesars Superdome, New Orleans, LA',
    isInternational: false,
    internationalCity: null,
    network: 'Fox',
  },
  {
    gameId: '2026_W1_MIA_LV',
    week: 1,
    date: '2026-09-13',
    kickoff: '2026-09-13T16:25:00-04:00',
    homeTeam: 'MIA',
    awayTeam: 'LV',
    location: 'Hard Rock Stadium, Miami Gardens, FL',
    isInternational: false,
    internationalCity: null,
    network: 'Fox',
  },
  {
    gameId: '2026_W1_ARI_LAC',
    week: 1,
    date: '2026-09-13',
    kickoff: '2026-09-13T16:25:00-04:00',
    homeTeam: 'ARI',
    awayTeam: 'LAC',
    location: 'State Farm Stadium, Glendale, AZ',
    isInternational: false,
    internationalCity: null,
    network: 'CBS',
  },
  {
    gameId: '2026_W1_GB_MIN',
    week: 1,
    date: '2026-09-13',
    kickoff: '2026-09-13T16:25:00-04:00',
    homeTeam: 'GB',
    awayTeam: 'MIN',
    location: 'Lambeau Field, Green Bay, WI',
    isInternational: false,
    internationalCity: null,
    network: 'CBS',
  },
  // TODO: VERIFY — Washington's Week 1 opponent is unconfirmed.
  // DEN plays KC on Monday Night Football (Sept 14), so WAS vs DEN (from the
  // original spec) was an error. Fill in the correct opponent from NFL.com.
  // {
  //   gameId: '2026_W1_WAS_???',
  //   week: 1,
  //   date: '2026-09-13',
  //   kickoff: '2026-09-13T16:25:00-04:00',
  //   homeTeam: 'WAS',
  //   awayTeam: '???',
  //   location: 'Northwest Stadium, Landover, MD',
  //   isInternational: false,
  //   internationalCity: null,
  //   network: 'CBS',
  // },
  {
    gameId: '2026_W1_NYG_DAL',
    week: 1,
    date: '2026-09-13',
    kickoff: '2026-09-13T20:20:00-04:00',
    homeTeam: 'NYG',
    awayTeam: 'DAL',
    location: 'MetLife Stadium, East Rutherford, NJ',
    isInternational: false,
    internationalCity: null,
    network: 'NBC',
  },
  {
    gameId: '2026_W1_KC_DEN',
    week: 1,
    date: '2026-09-14',
    kickoff: '2026-09-14T20:15:00-04:00',
    homeTeam: 'KC',
    awayTeam: 'DEN',
    location: 'GEHA Field at Arrowhead Stadium, Kansas City, MO',
    isInternational: false,
    internationalCity: null,
    network: 'ESPN/ABC',
  },

  // ─── WEEKS 2-18 ───────────────────────────────────────────────────────────
  // TODO: Populate all games for weeks 2-18.
  // Source: https://www.nfl.com/schedules or https://www.cbssports.com/nfl/schedule/
  // Use the same game object structure as Week 1 above.
  // Game ID format: '2026_W{week}_{homeTeam}_{awayTeam}'
  // Kickoff times in ISO 8601 with ET timezone offset (-04:00 before Nov 1, -05:00 after).
];

if (import.meta.env.DEV) {
  const totalGames = SCHEDULE.length;
  if (totalGames !== 272) {
    console.warn(
      `[schedule2026] Expected 272 games, found ${totalGames}. ` +
        'Weeks 2-18 need to be populated from the official NFL schedule.'
    );
  }
}
