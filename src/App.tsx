import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { lazy, Suspense, useEffect } from 'react';
import { SettingsPanel } from './components/settings';
import { ProtectedRoute } from './components/auth';
import { loadPanoramaManifest } from './lib/panorama';

const Home = lazy(() => import('./pages/Home'));
const Generate = lazy(() => import('./pages/Generate'));
const Results = lazy(() => import('./pages/Results'));
const Settings = lazy(() => import('./pages/Settings'));
const SavedResults = lazy(() => import('./pages/SavedResults'));
const Palace = lazy(() => import('./pages/Palace'));
const Sprint = lazy(() => import('./pages/Sprint'));
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
           * Results page shows generation output and navigation to learning
           * Kept for backward compatibility with existing saved results
           */}
          <Route path="/results/:id" element={
            <ProtectedRoute><Results /></ProtectedRoute>
          } />

          {/* ═══════════════════════════════════════════════════════════════
              LEARNING FLOW - Unified Study Command Center
              ═══════════════════════════════════════════════════════════════ */}
          
          {/* 
           * Unified Study Command Center
           * Combines Overview, Learn, Palace, and Sprint into tabbed interface
           * Phase 2.1 of Silver Bullet Architecture
           */}
          <Route path="/study/:subjectId" element={
            <ProtectedRoute><Study /></ProtectedRoute>
          } />
          
          {/* 
           * Palace standalone - accessed from Study when entering immersive mode
           */}
          <Route path="/palace" element={
            <ProtectedRoute><Palace /></ProtectedRoute>
          } />
          
          {/* 
           * Sprint standalone - accessed from Study when starting a sprint
           */}
          <Route path="/sprint" element={
            <ProtectedRoute><Sprint /></ProtectedRoute>
          } />

          {/* ═══════════════════════════════════════════════════════════════
              LEGACY REDIRECTS - Backward compatibility
              ═══════════════════════════════════════════════════════════════ */}
          
          {/* Redirect old /learn to unified Study page */}
          <Route path="/learn" element={<Navigate to="/study/current" replace />} />
          
          {/* Redirect old /sprint-results to Study sprint tab */}
          <Route path="/sprint-results" element={<Navigate to="/study/current?tab=sprint" replace />} />
          
          {/* Redirect old /saved to /library */}
          <Route path="/saved" element={<Navigate to="/library" replace />} />

          {/* ═══════════════════════════════════════════════════════════════
              SETTINGS & LIBRARY
              ═══════════════════════════════════════════════════════════════ */}
          <Route path="/settings" element={
            <ProtectedRoute><Settings /></ProtectedRoute>
          } />
          
          {/* 
           * Library - Saved/bookmarked generation results
           * Renamed from /saved for clarity
           */}
          <Route path="/library" element={
            <ProtectedRoute><SavedResults /></ProtectedRoute>
          } />
        </Routes>
        <SettingsPanel />
      </Suspense>
    </BrowserRouter>
  );
}

export default App;
