# NFL Pick'em 2026

A two-player NFL Pick'em tracker for the 2026 regular season. Both players pick every game before Week 1 (pre-season picks) and again week-by-week (weekly picks). Stats, head-to-head records, O/U tracking, and charts update in real time via Firebase.

---

## Firebase Setup

Do this once before running the app.

1. Go to <https://console.firebase.google.com>
2. Create a new project: **nfl-pickems-2026**
3. Enable **Firestore Database** — start in test mode
4. Enable **Anonymous Authentication** (Authentication → Sign-in method → Anonymous → Enable)
5. Go to Project Settings → General → Your Apps → **Add Web App**
6. Copy the config values shown under "SDK setup and configuration"
7. In the project root, copy `.env.example` to `.env.local` and fill in your values:

```bash
cp .env.example .env.local
```

```
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_FIREBASE_MEASUREMENT_ID=your_measurement_id
```

> **Important:** `.env.local` is listed in `.gitignore` and will never be committed. Never paste Firebase credentials directly into source files.

8. **After your first run**, designate the admin player (who can edit O/U lines and use admin controls):
   - Open the app in your browser and enter your name when prompted
   - Open the browser console and run: `localStorage.getItem('nfl_player_id')`
   - Copy the returned UID and add it to `.env.local`:
     ```
     VITE_ADMIN_PLAYER_ID=paste_your_uid_here
     ```
   - Restart the dev server (`npm run dev`) — the O/U Lines and Admin Controls sections in `/results` will now be visible only to you

9. Set Firestore security rules in the Firebase console (Rules tab):

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

> **Note:** Tighten these rules if the app ever goes beyond personal use.

---

## Run Locally

```bash
npm install
npm run dev
```

Open <http://localhost:5173/nfl-pickems-2026/> in your browser.

---

## Deploy to GitHub Pages

```bash
npm run deploy
```

This runs `vite build` then publishes `dist/` to the `gh-pages` branch. The app will be live at `https://<your-username>.github.io/nfl-pickems-2026/`.

Make sure your repo's GitHub Pages source is set to the `gh-pages` branch (Settings → Pages).

---

## How to Use

1. **First visit:** Enter your name. The app signs you in anonymously and remembers you via localStorage.
2. **Pre-Season Pick Sheet** (`/preseason`): Pick the winner of all 272 games before Week 1 kicks off (deadline: Sep 9, 2026 at 8:20 PM ET). Hit "Submit & Lock" when done.
3. **Weekly Picks** (`/week/1` through `/week/18`): Pick each week's games independently. Picks auto-save. Each week locks at first kickoff.
4. **Results** (`/results`): Either player enters the actual game winners after they're played. Also set O/U win total lines per team here.
5. **Dashboard** (`/dashboard`): Full stats — head-to-head record, accuracy tables, O/U tracker, upset tracker.
6. **Charts** (`/charts`): Visual breakdowns of accuracy, cumulative records, division splits, and win pace.

---

## Schedule Note

`src/data/schedule2026.js` contains confirmed Week 1 games. **Weeks 2-18 must be populated** from the official NFL schedule before the season. Verify all games at <https://www.nfl.com/schedules>. A console warning fires in dev mode if the total game count is not 272.

---

## Known TODOs

- **Upset definition:** Currently defined as "away team wins." After Week 4, update `upsetGames()` in `src/engine/statsEngine.js` to use team win/loss record instead. See the TODO comment in that file.
- **Weeks 2-18 schedule:** Must be filled in and verified against NFL.com.
- **O/U lines:** Set to `null` by default. Enter them via the Results admin screen before the season.

---

## License

MIT
