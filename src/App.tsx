import { BrowserRouter, Routes, Route, Navigate, useParams } from 'react-router-dom';
import { lazy, Suspense, useEffect } from 'react';
import { SettingsPanel } from './components/settings';
import { ProtectedRoute } from './components/auth';

import { usePersonalizationStore } from './store/personalization-store';
import { useBionicReading } from './hooks/useBionicReading';

const Home = lazy(() => import('./pages/Home'));
const Generate = lazy(() => import('./pages/Generate'));
const Settings = lazy(() => import('./pages/Settings'));
const SavedResults = lazy(() => import('./pages/SavedResults'));


const Study = lazy(() => import('./pages/Study'));
const VelocityLearning = lazy(() => import('./pages/VelocityLearning'));
const ContentLaunchpad = lazy(() => import('./components/learning/launchpad/ContentLaunchpad'));


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

// Redirect component for legacy /results/:id routes
function ResultsRedirect() {
  const { id } = useParams<{ id: string }>();
  return <Navigate to={`/study/${id}`} replace />;
}

function App() {
  const bionicReading = usePersonalizationStore(state => state.bionicReading);


  // Apply bionic reading mode to document
  useEffect(() => {
    if (bionicReading) {
      document.documentElement.setAttribute('data-bionic-reading', 'true');
    } else {
      document.documentElement.removeAttribute('data-bionic-reading');
    }
  }, [bionicReading]);

  // Apply bionic reading text processing
  useBionicReading();

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
          <Route path="/callback" element={<AuthCallback />} />

          {/* ═══════════════════════════════════════════════════════════════
              GENERATION FLOW
              ═══════════════════════════════════════════════════════════════ */}
          <Route path="/generate/:subject" element={
            <ProtectedRoute><Generate /></ProtectedRoute>
          } />

          {/*
           * Results page - now redirects to Study Command Center
           * Results.tsx is kept for backward compatibility but route redirects
           */}
          <Route path="/results/:id" element={<ResultsRedirect />} />

          {/* ═══════════════════════════════════════════════════════════════
              LEARNING FLOW - Unified Study Command Center
              ═══════════════════════════════════════════════════════════════ */}

          {/*
           * Unified Study Command Center
           * Combines Overview and Learning modes into tabbed interface
           * Phase 2.1 of Silver Bullet Architecture
           */}
          <Route path="/study/:subjectId" element={
            <ProtectedRoute><Study /></ProtectedRoute>
          } />






          {/* 
           * Velocity Learning - SensaAI Learning Velocity Engine experience
           */}
          <Route path="/velocity/:subjectId" element={
            <ProtectedRoute><VelocityLearning /></ProtectedRoute>
          } />

          {/* 
           * Content Launchpad - Analytics and Readiness Dashboard
           * The entry point for all saved content "View" actions
           */}
          <Route path="/launchpad/:subjectId" element={
            <ProtectedRoute><ContentLaunchpad /></ProtectedRoute>
          } />

          {/* ═══════════════════════════════════════════════════════════════
              LEGACY REDIRECTS - Backward compatibility
              ═══════════════════════════════════════════════════════════════ */}

          {/* Redirect old /learn to unified Study page */}
          <Route path="/learn" element={<Navigate to="/study/current" replace />} />



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
