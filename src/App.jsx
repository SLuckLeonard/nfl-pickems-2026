import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { usePlayerIdentity } from './hooks/usePlayerIdentity.js';
import { useAuthReady } from './hooks/useAuthReady.js';
import NavBar from './components/NavBar.jsx';
import SetupScreen from './components/SetupScreen.jsx';
import ErrorBoundary from './components/ErrorBoundary.jsx';
import PreSeasonPickSheet from './pages/PreSeasonPickSheet.jsx';
import WeeklyPickSheet from './pages/WeeklyPickSheet.jsx';
import ResultsEntry from './pages/ResultsEntry.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Charts from './pages/Charts.jsx';
import SharePage from './pages/SharePage.jsx';

export default function App() {
  const { playerId, isReady, setupPlayer, linkDevice } = usePlayerIdentity();
  const authReady = useAuthReady();

  // Wait for the localStorage check and the anonymous auth session (required by
  // the Firestore rules) before rendering anything that reads/writes Firestore.
  if (!isReady || !authReady) return null;

  // First visit — show full-screen setup before anything else
  if (!playerId) {
    return <SetupScreen onSetup={setupPlayer} onLink={linkDevice} />;
  }

  return (
    <div className="app">
      <NavBar />
      <main className="app-main">
        <ErrorBoundary>
          <Routes>
            <Route path="/" element={<Navigate to="/preseason" replace />} />
            <Route path="/preseason" element={<PreSeasonPickSheet />} />
            <Route path="/week/:weekNumber" element={<WeeklyPickSheet />} />
            <Route path="/results" element={<ResultsEntry />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/charts" element={<Charts />} />
            <Route path="/share" element={<SharePage />} />
          </Routes>
        </ErrorBoundary>
      </main>
    </div>
  );
}
