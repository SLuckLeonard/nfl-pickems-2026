export const TEAMS = {
  BUF: { id: 'BUF', name: 'Buffalo Bills',           city: 'Buffalo',        conf: 'AFC', div: 'East',  abbr: 'BUF' },
  MIA: { id: 'MIA', name: 'Miami Dolphins',           city: 'Miami',          conf: 'AFC', div: 'East',  abbr: 'MIA' },
  NE:  { id: 'NE',  name: 'New England Patriots',     city: 'New England',    conf: 'AFC', div: 'East',  abbr: 'NE'  },
  NYJ: { id: 'NYJ', name: 'New York Jets',             city: 'New York',       conf: 'AFC', div: 'East',  abbr: 'NYJ' },
  BAL: { id: 'BAL', name: 'Baltimore Ravens',          city: 'Baltimore',      conf: 'AFC', div: 'North', abbr: 'BAL' },
  CIN: { id: 'CIN', name: 'Cincinnati Bengals',        city: 'Cincinnati',     conf: 'AFC', div: 'North', abbr: 'CIN' },
  CLE: { id: 'CLE', name: 'Cleveland Browns',          city: 'Cleveland',      conf: 'AFC', div: 'North', abbr: 'CLE' },
  PIT: { id: 'PIT', name: 'Pittsburgh Steelers',       city: 'Pittsburgh',     conf: 'AFC', div: 'North', abbr: 'PIT' },
  HOU: { id: 'HOU', name: 'Houston Texans',            city: 'Houston',        conf: 'AFC', div: 'South', abbr: 'HOU' },
  IND: { id: 'IND', name: 'Indianapolis Colts',        city: 'Indianapolis',   conf: 'AFC', div: 'South', abbr: 'IND' },
  JAX: { id: 'JAX', name: 'Jacksonville Jaguars',      city: 'Jacksonville',   conf: 'AFC', div: 'South', abbr: 'JAX' },
  TEN: { id: 'TEN', name: 'Tennessee Titans',          city: 'Tennessee',      conf: 'AFC', div: 'South', abbr: 'TEN' },
  DEN: { id: 'DEN', name: 'Denver Broncos',            city: 'Denver',         conf: 'AFC', div: 'West',  abbr: 'DEN' },
  KC:  { id: 'KC',  name: 'Kansas City Chiefs',        city: 'Kansas City',    conf: 'AFC', div: 'West',  abbr: 'KC'  },
  LV:  { id: 'LV',  name: 'Las Vegas Raiders',         city: 'Las Vegas',      conf: 'AFC', div: 'West',  abbr: 'LV'  },
  LAC: { id: 'LAC', name: 'Los Angeles Chargers',      city: 'Los Angeles',    conf: 'AFC', div: 'West',  abbr: 'LAC' },
  DAL: { id: 'DAL', name: 'Dallas Cowboys',            city: 'Dallas',         conf: 'NFC', div: 'East',  abbr: 'DAL' },
  NYG: { id: 'NYG', name: 'New York Giants',           city: 'New York',       conf: 'NFC', div: 'East',  abbr: 'NYG' },
  PHI: { id: 'PHI', name: 'Philadelphia Eagles',       city: 'Philadelphia',   conf: 'NFC', div: 'East',  abbr: 'PHI' },
  WAS: { id: 'WAS', name: 'Washington Commanders',     city: 'Washington',     conf: 'NFC', div: 'East',  abbr: 'WAS' },
  CHI: { id: 'CHI', name: 'Chicago Bears',             city: 'Chicago',        conf: 'NFC', div: 'North', abbr: 'CHI' },
  DET: { id: 'DET', name: 'Detroit Lions',             city: 'Detroit',        conf: 'NFC', div: 'North', abbr: 'DET' },
  GB:  { id: 'GB',  name: 'Green Bay Packers',         city: 'Green Bay',      conf: 'NFC', div: 'North', abbr: 'GB'  },
  MIN: { id: 'MIN', name: 'Minnesota Vikings',         city: 'Minnesota',      conf: 'NFC', div: 'North', abbr: 'MIN' },
  ATL: { id: 'ATL', name: 'Atlanta Falcons',           city: 'Atlanta',        conf: 'NFC', div: 'South', abbr: 'ATL' },
  CAR: { id: 'CAR', name: 'Carolina Panthers',         city: 'Carolina',       conf: 'NFC', div: 'South', abbr: 'CAR' },
  NO:  { id: 'NO',  name: 'New Orleans Saints',        city: 'New Orleans',    conf: 'NFC', div: 'South', abbr: 'NO'  },
  TB:  { id: 'TB',  name: 'Tampa Bay Buccaneers',      city: 'Tampa Bay',      conf: 'NFC', div: 'South', abbr: 'TB'  },
  ARI: { id: 'ARI', name: 'Arizona Cardinals',         city: 'Arizona',        conf: 'NFC', div: 'West',  abbr: 'ARI' },
  LAR: { id: 'LAR', name: 'Los Angeles Rams',          city: 'Los Angeles',    conf: 'NFC', div: 'West',  abbr: 'LAR' },
  SF:  { id: 'SF',  name: 'San Francisco 49ers',       city: 'San Francisco',  conf: 'NFC', div: 'West',  abbr: 'SF'  },
  SEA: { id: 'SEA', name: 'Seattle Seahawks',          city: 'Seattle',        conf: 'NFC', div: 'West',  abbr: 'SEA' },
};

export const TEAM_IDS = Object.keys(TEAMS);

export const BY_CONFERENCE = {
  AFC: TEAM_IDS.filter((id) => TEAMS[id].conf === 'AFC'),
  NFC: TEAM_IDS.filter((id) => TEAMS[id].conf === 'NFC'),
};

export const BY_DIVISION = {
  'AFC East':  TEAM_IDS.filter((id) => TEAMS[id].conf === 'AFC' && TEAMS[id].div === 'East'),
  'AFC North': TEAM_IDS.filter((id) => TEAMS[id].conf === 'AFC' && TEAMS[id].div === 'North'),
  'AFC South': TEAM_IDS.filter((id) => TEAMS[id].conf === 'AFC' && TEAMS[id].div === 'South'),
  'AFC West':  TEAM_IDS.filter((id) => TEAMS[id].conf === 'AFC' && TEAMS[id].div === 'West'),
  'NFC East':  TEAM_IDS.filter((id) => TEAMS[id].conf === 'NFC' && TEAMS[id].div === 'East'),
  'NFC North': TEAM_IDS.filter((id) => TEAMS[id].conf === 'NFC' && TEAMS[id].div === 'North'),
  'NFC South': TEAM_IDS.filter((id) => TEAMS[id].conf === 'NFC' && TEAMS[id].div === 'South'),
  'NFC West':  TEAM_IDS.filter((id) => TEAMS[id].conf === 'NFC' && TEAMS[id].div === 'West'),
};
