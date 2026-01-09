import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { SettingsPanel } from './components/settings';
import { ProtectedRoute } from './components/auth';

import { useBionicReading } from './hooks/useBionicReading';

const Home = lazy(() => import('./pages/Home'));
const Generate = lazy(() => import('./pages/Generate'));
const Settings = lazy(() => import('./pages/Settings'));
const SavedResults = lazy(() => import('./pages/SavedResults'));


const Study = lazy(() => import('./pages/Study'));
const VelocityLearning = lazy(() => import('./pages/VelocityLearning'));
const ContentLaunchpad = lazy(() => import('./components/learning/launchpad/ContentLaunchpad'));
const DocumentView = lazy(() => import('./pages/DocumentView'));


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
  // const bionicReading = usePersonalizationStore(state => state.bionicReading);


  // Apply bionic reading mode to document
  // useEffect(() => {
  //   if (bionicReading) {
  //     document.documentElement.setAttribute('data-bionic-reading', 'true');
  //   } else {
  //     document.documentElement.removeAttribute('data-bionic-reading');
  //   }
  // }, [bionicReading]);

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

          {/* Document Viewer */}
          <Route path="/view/:id" element={
            <ProtectedRoute><DocumentView /></ProtectedRoute>
          } />
        </Routes>
        <SettingsPanel />
      </Suspense>
    </BrowserRouter>
  );
}

export default App;
