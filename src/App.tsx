import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { lazy, Suspense, useEffect, useRef } from 'react';
import { SettingsPanel } from './components/settings';
import { ProtectedRoute, RoleGuard } from './components/auth';
import { AppErrorBoundary } from './components/error/AppErrorBoundary';
import BackgroundJobToast from './components/ui/BackgroundJobToast';
import { GlobalNav, NavSpacer } from './components/layout';
import { useAuthStore } from './store/auth-store';
import { useLearningStore } from './store/learning-store';

const Landing = lazy(() => import('./pages/Landing'));
const Home = lazy(() => import('./pages/Home'));
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
const CuratorDashboard = lazy(() => import('./pages/CuratorDashboard'));

// CLM Components (lazy-loaded to avoid bundling for learners)
const AuditQueueView = lazy(() => import('./features/clm/components/AuditQueueView').then(m => ({ default: m.AuditQueueView })));
const AuditDetailView = lazy(() => import('./features/clm/components/AuditDetailView').then(m => ({ default: m.AuditDetailView })));
const AnalyticsDashboard = lazy(() => import('./features/clm/components/AnalyticsDashboard').then(m => ({ default: m.AnalyticsDashboard })));
const ContentGenerator = lazy(() => import('./features/clm/pages/ContentGenerator'));
const GenerateLanding = lazy(() => import('./features/clm/pages/GenerateLanding'));
const CuratorLibraryView = lazy(() => import('./features/clm/pages/CuratorLibraryView'));
const CuratorPreview = lazy(() => import('./features/clm/pages/CuratorPreview'));
const ContentEditor = lazy(() => import('./features/clm/pages/ContentEditor'));

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
                            AUTHENTICATION ROUTES
                        ═══════════════════════════════════════════════════════════════ */}
                        <Route path="/login" element={<Login />} />
                        <Route path="/signup" element={<SignUp />} />
                        <Route path="/confirm-signup" element={<ConfirmSignUp />} />
                        <Route path="/forgot-password" element={<ForgotPassword />} />
                        <Route path="/reset-password" element={<ResetPassword />} />
                        <Route path="/auth/callback" element={<AuthCallback />} />
                        <Route path="/callback" element={<AuthCallback />} />

                        {/* ═══════════════════════════════════════════════════════════════
                            LANDING & HOME
                        ═══════════════════════════════════════════════════════════════ */}
                        <Route path="/" element={<Landing />} />
                        <Route path="/home" element={<Home />} />

                        {/* ═══════════════════════════════════════════════════════════════
                            LEARNER ROUTES (Protected)
                        ═══════════════════════════════════════════════════════════════ */}
                        
                        {/* Library & Content Discovery */}
                        <Route path="/library" element={
                            <ProtectedRoute><MasteryDashboard /></ProtectedRoute>
                        } />
                        <Route path="/community" element={
                            <ProtectedRoute><CommunityLibrary /></ProtectedRoute>
                        } />

                        {/* Content Launchpad - Entry point for saved content */}
                        <Route path="/launchpad/:subjectId" element={
                            <ProtectedRoute><GymLaunchpad /></ProtectedRoute>
                        } />

                        {/* Unified Study Room - Active learning interface */}
                        <Route path="/study/:subjectId" element={
                            <ProtectedRoute><UnifiedStudyRoom /></ProtectedRoute>
                        } />

                        {/* Content Generation - Learner-accessible generation flow */}
                        <Route path="/generate/:subject" element={
                            <ProtectedRoute><ContentGenerator /></ProtectedRoute>
                        } />

                        {/* ═══════════════════════════════════════════════════════════════
                            CURATOR ROUTES (Admin/Curator Only)
                            Content Lifecycle Management Dashboard
                        ═══════════════════════════════════════════════════════════════ */}
                        <Route path="/curator" element={
                            <ProtectedRoute>
                                <RoleGuard allowedRoles={['curator', 'admin']}>
                                    <CuratorDashboard />
                                </RoleGuard>
                            </ProtectedRoute>
                        }>
                            <Route index element={<AuditQueueView />} />
                            <Route path="audits" element={<AuditQueueView />} />
                            <Route path="audits/:auditId" element={<AuditDetailView />} />
                            <Route path="analytics" element={<AnalyticsDashboard />} />
                            <Route path="library" element={<CuratorLibraryView />} />
                            <Route path="preview/:subjectId" element={<CuratorPreview />} />
                            <Route path="edit/:subjectId" element={<ContentEditor />} />
                            <Route path="generate" element={<GenerateLanding />} />
                            <Route path="generate/:subject" element={<ContentGenerator />} />
                        </Route>

                        {/* ═══════════════════════════════════════════════════════════════
                            DEVELOPMENT & FALLBACK
                        ═══════════════════════════════════════════════════════════════ */}
                        <Route path="/dev" element={<DevSandbox />} />
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
