import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { lazy, Suspense, useEffect, useRef } from 'react';
import { SettingsPanel } from './components/settings';
import { ProtectedRoute } from './components/auth';
import { AppErrorBoundary } from './components/error/AppErrorBoundary';
import BackgroundJobToast from './components/ui/BackgroundJobToast';
import { GlobalNav, NavSpacer } from './components/layout';
import { useAuthStore } from './store/auth-store';
import { useLearningStore } from './store/learning-store';

const Home = lazy(() => import('./pages/Home'));
const ContentGenerator = lazy(() => import('./pages/ContentGenerator'));
const MasteryDashboard = lazy(() => import('./pages/MasteryDashboard'));
const CommunityLibrary = lazy(() => import('./pages/CommunityLibrary'));

const UnifiedStudyRoom = lazy(() => import('./pages/UnifiedStudyRoom'));
const GymLaunchpad = lazy(() => import('./pages/GymLaunchpad'));

const Login = lazy(() => import('./pages/Login').then(m => ({ default: m.Login })));
const SignUp = lazy(() => import('./pages/SignUp').then(m => ({ default: m.SignUp })));
const ConfirmSignUp = lazy(() => import('./pages/ConfirmSignUp').then(m => ({ default: m.ConfirmSignUp })));
const AuthCallback = lazy(() => import('./pages/AuthCallback').then(m => ({ default: m.AuthCallback })));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword').then(m => ({ default: m.ForgotPassword })));
const ResetPassword = lazy(() => import('./pages/ResetPassword').then(m => ({ default: m.ResetPassword })));
const NotFound = lazy(() => import('./pages/NotFound'));
const DevSandbox = lazy(() => import('./pages/DevSandbox'));

function useMigration() {
    const hasRun = useRef(false);
    const studySession = useLearningStore(state => state.studySession);
    const updateSession = useLearningStore(state => state.updateSession);
    useEffect(() => {
        if (hasRun.current) return;
        hasRun.current = true;
        if (!studySession || studySession.phaseProgress) return;
        try {
            updateSession({
                phaseProgress: {
                    orientCompleted: Boolean((studySession as any).scouted || (studySession as any).overviewViewed),
                    structureCompleted: (studySession as any).mapBuilt ?? false,
                    encodeStarted: (studySession as any).conceptsCompleted?.length > 0,
                    verifyCompleted: (studySession as any).mastered ?? false,
                },
                adaptations: {}
            });
        } catch { }
    }, [studySession, updateSession]);
}

function App() {
    const initializeAuthListeners = useAuthStore(state => state.initializeAuthListeners);

    useMigration();

    useEffect(() => {
        return initializeAuthListeners();
    }, [initializeAuthListeners]);

    return (
        <AppErrorBoundary>
            <BrowserRouter>
                <Suspense fallback={null}>
                    <NavSpacer />
                    <Routes>
                        {/* ═══════════════════════════════════════════════════════════════
 PUBLIC ROUTES
 ═══════════════════════════════════════════════════════════════ */}
                        <Route path="/dev" element={<DevSandbox />} />
                        <Route path="/" element={<Home />} />
                        <Route path="/login" element={<Login />} />
                        <Route path="/signup" element={<SignUp />} />
                        <Route path="/confirm-signup" element={<ConfirmSignUp />} />
                        <Route path="/forgot-password" element={<ForgotPassword />} />
                        <Route path="/reset-password" element={<ResetPassword />} />
                        <Route path="/auth/callback" element={<AuthCallback />} />
                        <Route path="/callback" element={<AuthCallback />} />

                        {/* ═══════════════════════════════════════════════════════════════
 GENERATION FLOW
 ═══════════════════════════════════════════════════════════════ */}
                        <Route path="/generate/:subject" element={
                            <ProtectedRoute><ContentGenerator /></ProtectedRoute>
                        } />

                        {/* ═══════════════════════════════════════════════════════════════
 LEARNING FLOW - Unified Study Command Center
 ═══════════════════════════════════════════════════════════════ */}

                        {/*
 * Unified Study Command Center
 * Combines Overview and Learning modes into tabbed interface
 * Phase 2.1 of Silver Bullet Architecture
 * 
 * ActiveLearningEngine is embedded in the Learn tab, not a standalone route
 */}
                        <Route path="/study/:subjectId" element={
                            <ProtectedRoute><UnifiedStudyRoom /></ProtectedRoute>
                        } />

                        {/* 
 * Content Launchpad - Analytics and Readiness Dashboard
 * The entry point for all saved content "View" actions
 */}
                        <Route path="/launchpad/:subjectId" element={
                            <ProtectedRoute><GymLaunchpad /></ProtectedRoute>
                        } />

                        {/* ═══════════════════════════════════════════════════════════════
 LIBRARY
 ═══════════════════════════════════════════════════════════════ */}
                        <Route path="/library" element={
                            <ProtectedRoute><MasteryDashboard /></ProtectedRoute>
                        } />
                        <Route path="/community" element={
                            <ProtectedRoute><CommunityLibrary /></ProtectedRoute>
                        } />
                        {/* Catch-all 404 */}
                        <Route path="*" element={<NotFound />} />
                    </Routes>
                    <SettingsPanel />
                    <BackgroundJobToast />
                    <GlobalNav />
                </Suspense>
            </BrowserRouter>
        </AppErrorBoundary>
    );
}

export default App;
