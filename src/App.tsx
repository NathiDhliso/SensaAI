import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { lazy, Suspense, useEffect } from 'react';
import { SettingsPanel } from './components/settings';
import { ProtectedRoute } from './components/auth';
import BackgroundJobToast from './components/ui/BackgroundJobToast';
import { useAuthStore } from './store/auth-store';

const Home = lazy(() => import('./pages/Home'));
const Generate = lazy(() => import('./pages/Generate'));
const SavedResults = lazy(() => import('./pages/SavedResults'));

const Study = lazy(() => import('./pages/Study'));
const ContentLaunchpad = lazy(() => import('./components/learning/launchpad/ContentLaunchpad'));
const DocumentView = lazy(() => import('./pages/DocumentView'));

const Login = lazy(() => import('./pages/Login').then(m => ({ default: m.Login })));
const SignUp = lazy(() => import('./pages/SignUp').then(m => ({ default: m.SignUp })));
const ConfirmSignUp = lazy(() => import('./pages/ConfirmSignUp').then(m => ({ default: m.ConfirmSignUp })));
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
 const initializeAuthListeners = useAuthStore(state => state.initializeAuthListeners);

 useEffect(() => {
 return initializeAuthListeners();
 }, [initializeAuthListeners]);

 return (
 <BrowserRouter>
 <Suspense fallback={<LoadingFallback />}>
 <Routes>
 {/* ═══════════════════════════════════════════════════════════════
 PUBLIC ROUTES
 ═══════════════════════════════════════════════════════════════ */}
 <Route path="/" element={<Home />} />
 <Route path="/login" element={<Login />} />
 <Route path="/signup" element={<SignUp />} />
 <Route path="/confirm-signup" element={<ConfirmSignUp />} />
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
 * 
 * VelocityLearning is embedded in the Learn tab, not a standalone route
 */}
 <Route path="/study/:subjectId" element={
 <ProtectedRoute><Study /></ProtectedRoute>
 } />

 {/* 
 * Content Launchpad - Analytics and Readiness Dashboard
 * The entry point for all saved content "View" actions
 */}
 <Route path="/launchpad/:subjectId" element={
 <ProtectedRoute><ContentLaunchpad /></ProtectedRoute>
 } />

 {/* ═══════════════════════════════════════════════════════════════
 LIBRARY
 ═══════════════════════════════════════════════════════════════ */}
 <Route path="/library" element={
 <ProtectedRoute><SavedResults /></ProtectedRoute>
 } />

 {/* Document Viewer */}
 <Route path="/view/:id" element={
 <ProtectedRoute><DocumentView /></ProtectedRoute>
 } />
 </Routes>
 <SettingsPanel />
 <BackgroundJobToast />
 </Suspense>
 </BrowserRouter>
 );
}

export default App;
