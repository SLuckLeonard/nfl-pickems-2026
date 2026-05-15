import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import NavBar from './components/NavBar.jsx';
import PreSeasonPickSheet from './pages/PreSeasonPickSheet.jsx';
import WeeklyPickSheet from './pages/WeeklyPickSheet.jsx';
import ResultsEntry from './pages/ResultsEntry.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Charts from './pages/Charts.jsx';

export default function App() {
  return (
    <div className="app">
      <NavBar />
      <main className="app-main">
        <Routes>
          <Route path="/" element={<Navigate to="/preseason" replace />} />
          <Route path="/preseason" element={<PreSeasonPickSheet />} />
          <Route path="/week/:weekNumber" element={<WeeklyPickSheet />} />
          <Route path="/results" element={<ResultsEntry />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/charts" element={<Charts />} />
        </Routes>
      </main>
    </div>
  );
}
