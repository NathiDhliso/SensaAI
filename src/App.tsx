import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { lazy, Suspense, useEffect } from 'react';
import { SettingsPanel } from './components/settings';
import { ProtectedRoute } from './components/auth';
import { loadPanoramaManifest } from './lib/panorama';

const Home = lazy(() => import('./pages/Home'));
const Generate = lazy(() => import('./pages/Generate'));
const Results = lazy(() => import('./pages/Results'));
const Settings = lazy(() => import('./pages/Settings'));
const Learn = lazy(() => import('./pages/Learn'));
const SavedResults = lazy(() => import('./pages/SavedResults'));
const Palace = lazy(() => import('./pages/Palace'));
const Sprint = lazy(() => import('./pages/Sprint'));
const SprintResults = lazy(() => import('./pages/SprintResults'));
const Study = lazy(() => import('./pages/Study'));
const Login = lazy(() => import('./pages/Login').then(m => ({ default: m.Login })));
const AuthCallback = lazy(() => import('./pages/AuthCallback').then(m => ({ default: m.AuthCallback })));

function LoadingFallback() {
  return (
    <div className="loading-container">
      <div className="loading-spinner" />
      <p>Loading...</p>
    </div>
  );
}

function App() {
  useEffect(() => {
    loadPanoramaManifest();
  }, []);

  return (
    <BrowserRouter>
      <Suspense fallback={<LoadingFallback />}>
        <Routes>
          {/* ═══════════════════════════════════════════════════════════════
              PUBLIC ROUTES
              ═══════════════════════════════════════════════════════════════ */}
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/auth/callback" element={<AuthCallback />} />

          {/* ═══════════════════════════════════════════════════════════════
              GENERATION FLOW
              ═══════════════════════════════════════════════════════════════ */}
          <Route path="/generate/:subject" element={
            <ProtectedRoute><Generate /></ProtectedRoute>
          } />
          
          {/* 
           * @deprecated Phase 2.1 - Will be replaced by /study/:subjectId
           * Results page shows generation output and navigation to learning
           * TODO: Merge into unified Study Command Center
           */}
          <Route path="/results/:id" element={
            <ProtectedRoute><Results /></ProtectedRoute>
          } />

          {/* ═══════════════════════════════════════════════════════════════
              LEARNING FLOW (Phase 2.1 - To be unified under /study/:subjectId)
              ═══════════════════════════════════════════════════════════════ */}
          
          {/* 
           * NEW: Unified Study Command Center
           * Combines Overview, Learn, Palace, and Sprint into tabbed interface
           * Phase 2.1 of Silver Bullet Architecture
           */}
          <Route path="/study/:subjectId" element={
            <ProtectedRoute><Study /></ProtectedRoute>
          } />
          
          {/* 
           * @deprecated Phase 2.1 - Will become /study/:subjectId (Learn tab)
           * Linear concept learning with lifecycle phases
           */}
          <Route path="/learn" element={
            <ProtectedRoute><Learn /></ProtectedRoute>
          } />
          
          {/* 
           * @deprecated Phase 2.1 - Will become /study/:subjectId (Palace tab)
           * Memory Palace spatial learning environment
           */}
          <Route path="/palace" element={
            <ProtectedRoute><Palace /></ProtectedRoute>
          } />
          
          {/* 
           * @deprecated Phase 2.1 - Will become /study/:subjectId/sprint
           * Automaticity Sprint - timed pattern recognition test
           */}
          <Route path="/sprint" element={
            <ProtectedRoute><Sprint /></ProtectedRoute>
          } />
          
          {/* 
           * @deprecated Phase 2.1 - Will merge into Sprint completion flow
           * Sprint results and exam readiness assessment
           */}
          <Route path="/sprint-results" element={
            <ProtectedRoute><SprintResults /></ProtectedRoute>
          } />

          {/* ═══════════════════════════════════════════════════════════════
              SETTINGS & LIBRARY
              ═══════════════════════════════════════════════════════════════ */}
          <Route path="/settings" element={
            <ProtectedRoute><Settings /></ProtectedRoute>
          } />
          
          {/* 
           * @deprecated Phase 2.1 - Will become /library
           * Saved/bookmarked generation results
           * TODO: Rename to /library for clarity
           */}
          <Route path="/saved" element={
            <ProtectedRoute><SavedResults /></ProtectedRoute>
          } />
        </Routes>
        <SettingsPanel />
      </Suspense>
    </BrowserRouter>
  );
}

export default App;
