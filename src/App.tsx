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
          {/* Public routes */}
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/auth/callback" element={<AuthCallback />} />

          {/* Protected routes - require auth in production */}
          <Route path="/generate/:subject" element={
            <ProtectedRoute><Generate /></ProtectedRoute>
          } />
          <Route path="/results/:id" element={
            <ProtectedRoute><Results /></ProtectedRoute>
          } />
          <Route path="/settings" element={
            <ProtectedRoute><Settings /></ProtectedRoute>
          } />
          <Route path="/learn" element={
            <ProtectedRoute><Learn /></ProtectedRoute>
          } />
          <Route path="/saved" element={
            <ProtectedRoute><SavedResults /></ProtectedRoute>
          } />
          <Route path="/palace" element={
            <ProtectedRoute><Palace /></ProtectedRoute>
          } />
          <Route path="/sprint" element={
            <ProtectedRoute><Sprint /></ProtectedRoute>
          } />
          <Route path="/sprint-results" element={
            <ProtectedRoute><SprintResults /></ProtectedRoute>
          } />
        </Routes>
        <SettingsPanel />
      </Suspense>
    </BrowserRouter>
  );
}

export default App;
