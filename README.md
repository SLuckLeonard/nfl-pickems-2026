# NFL Pick'em 2026

A full-stack NFL prediction tracker built for two players to compete across the entire 2026 regular season and playoffs. Pick all 272 regular season games before Week 1, make independent weekly picks, track O/U win totals, and watch your stats update in real time.

**Live:** [sluckleonard.github.io/nfl-pickems-2026](https://sluckleonard.github.io/nfl-pickems-2026)

---

## Features

**Dual Pick System**
- **Pre-Season Picks** — pick the winner of all 272 regular season games before Week 1 locks. Predicted standings and playoff bracket update live as you pick.
- **Weekly Picks** — pick each week's games independently. Tracked separately from pre-season picks so you can see whether your gut instinct or your pre-season research serves you better.

**Playoff Bracket Predictions**
- Bracket seeding is derived automatically from your pre-season picks using division standings and tiebreaker logic
- Pick the winner of every playoff round through the Super Bowl
- Opponent's bracket stays hidden until the admin reveals it at season start

**Live Stats Dashboard**
- Head-to-head record between both players, week by week and overall
- Weekly accuracy % for both pre-season and weekly picks, side by side
- Rolling 4-week accuracy, best/worst week, longest streaks
- Conference and division accuracy splits
- O/U win total tracker with projected final wins and over/under status per team
- Upset tracker showing every upset and whether each player called it

**Charts**
- Weekly accuracy line chart (both players)
- Pre-season vs weekly accuracy comparison by week
- Cumulative accuracy over the season
- Division accuracy horizontal bar charts
- O/U hit rate breakdown with per-team status chips
- Team win pace chart vs O/U lines

**Real-Time Sync**
- Both players see results and stats update instantly via Firebase Firestore
- No account required — anonymous auth with optional device linking for cross-device use

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite |
| Database | Firebase Firestore |
| Auth | Firebase Anonymous Auth |
| Charts | Recharts |
| Hosting | GitHub Pages |
| Styling | Plain CSS with custom properties |
| Testing | Vitest |

---

## Architecture

```
src/
├── data/
│   ├── schedule2026.js     # All 272 regular season games
│   ├── teams.js            # 32 teams with divisions and conferences
│   ├── weekLocks.js        # Kickoff datetimes for lock logic
│   └── logos.js            # ESPN CDN logo URLs
├── engine/
│   ├── statsEngine.js      # Pure functions — accuracy, streaks, O/U, upsets
│   └── bracketEngine.js    # Pure functions — seeding, bracket logic
├── firebase/
│   └── config.js           # Firebase initialization
├── hooks/
│   ├── useFirestore.js     # Real-time Firestore subscriptions
│   ├── usePlayerIdentity.js# Anonymous auth + localStorage identity
│   └── useCurrentWeek.js   # Current NFL week from schedule
├── pages/
│   ├── PreSeasonPickSheet  # 272-game picker + live standings + bracket
│   ├── WeeklyPickSheet     # Per-week game picker
│   ├── ResultsEntry        # Admin — enter results, set O/U lines
│   ├── Dashboard           # Full stats view
│   └── Charts              # Recharts visualizations
└── components/
    ├── GameCard            # Pick card with correct/wrong states
    ├── TeamLogo            # ESPN CDN logo with fallback
    ├── BracketPanel        # Playoff bracket renderer
    ├── StandingsPanel      # Division standings from picks
    └── ...
```

**Stats and bracket logic live entirely in pure functions** with no side effects. Components fetch data from Firestore, pass it to the engine functions, and render the results. This makes the logic independently testable — 36 unit tests cover all stat functions.

---

## Data Flow

```
Schedule (static) ──→ Pick Sheets ──→ Firestore (picks)
                                             │
Results Entry ──────────────────────→ Firestore (results)
                                             │
                              Stats Engine + Bracket Engine
                                             │
                              Dashboard · Charts · Bracket
```

---

## Getting Started

### Prerequisites
- Node.js 18+
- A Firebase project (free Spark plan)

### Firebase Setup

1. Go to [console.firebase.google.com](https://console.firebase.google.com)
2. Create a new project: `nfl-pickems-2026`
3. Enable **Firestore Database** — start in test mode
4. Enable **Anonymous Authentication** (Authentication → Sign-in method → Anonymous → Enable)
5. Go to Project Settings → General → Your Apps → **Add Web App**
6. Copy the config values shown under "SDK setup and configuration"

### Installation

```bash
git clone https://github.com/sluckleonard/nfl-pickems-2026.git
cd nfl-pickems-2026
npm install
```

Create `.env.local` from the example file:

```bash
cp .env.example .env.local
```

Fill in your Firebase config values:

```env
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_FIREBASE_MEASUREMENT_ID=your_measurement_id
```

> `.env.local` is gitignored and will never be committed. Never paste credentials directly into source files.

### Admin Setup

After your first run, designate the admin player (who can enter results, set O/U lines, and manage locks):

```bash
npm run dev
```

1. Open the app and enter your name when prompted
2. Open the browser console and run: `localStorage.getItem('nfl_player_id')`
3. Copy the returned UID and add it to `.env.local`:
   ```
   VITE_ADMIN_PLAYER_ID=paste_your_uid_here
   ```
4. Restart the dev server — admin controls are now visible only to you

### Firestore Rules

Set these rules in the Firebase console (Rules tab):

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true;
    }
  }
}
```

> Tighten these rules before sharing beyond personal use.

### Run Locally

```bash
npm run dev
```

Open [http://localhost:5173/nfl-pickems-2026/](http://localhost:5173/nfl-pickems-2026/)

### Run Tests

```bash
npm test
```

36 unit tests covering all stats engine and bracket engine functions.

---

## Deployment

```bash
npm run deploy
```

Builds the app and publishes to the `gh-pages` branch. Enable GitHub Pages in your repo settings (Settings → Pages → source: `gh-pages` branch).

---

## How to Use

| Step | What to do |
|---|---|
| First visit | Enter your name. The app signs you in anonymously and remembers you. |
| Pre-season | Go to **Picks & Standings**, pick all 272 games, watch your predicted standings and bracket update live. When done, hit Submit & Lock before Sep 9 at 8:20 PM ET. |
| Each week | Go to **Weekly Picks**, pick that week's games. Auto-saves. Locks at first kickoff. |
| After games | Go to **Results**, enter the actual winners. Stats and charts update immediately for both players. |
| Playoffs | Your bracket seeding is derived from your pre-season picks. Pick the winner of each round through the Super Bowl. |
| All season | Check **Dashboard** and **Charts** for head-to-head stats, accuracy trends, and O/U tracking. |

### Multi-Device Use

Each device gets its own anonymous identity by default. To use the same account on multiple devices:

1. On your primary device, click your name in the navbar and copy your Player ID
2. On the new device, choose "Already have an account? Enter your Player ID" on the setup screen
3. Paste your Player ID — the app adopts your existing identity

---

## Known Limitations & Planned Improvements

**Current limitations:**
- Upset definition uses "away team wins" as a proxy. After Week 4, this should be updated to use team win/loss records. See `TODO` comment in `src/engine/statsEngine.js`.
- Firestore security rules are open — appropriate for private personal use, should be tightened for any public deployment.
- Tiebreaker logic for playoff seeding uses a simplified model. Full NFL tiebreaker rules (strength of victory, strength of schedule, etc.) are not implemented. See `TODO` in `src/engine/bracketEngine.js`.

**Planned improvements:**
- Live score integration via a real-time sports API to auto-populate results without manual entry
- Record-based upset definition replacing the away-team proxy after sufficient game data accumulates
- Full NFL tiebreaker implementation for more accurate playoff seeding

---

## License

MIT
