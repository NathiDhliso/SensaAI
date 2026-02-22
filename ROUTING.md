# Application Routing Structure

## Overview
This document defines the complete routing structure for the SensaPBL application, organized by user role and functionality.

---

## Route Categories

### 1. Authentication Routes (Public)
Routes for user authentication and account management.

| Route | Component | Description |
|-------|-----------|-------------|
| `/login` | Login | User login page |
| `/signup` | SignUp | New user registration |
| `/confirm-signup` | ConfirmSignUp | Email verification after signup |
| `/forgot-password` | ForgotPassword | Password reset request |
| `/reset-password` | ResetPassword | Password reset form |
| `/auth/callback` | AuthCallback | OAuth callback handler |
| `/callback` | AuthCallback | Alternative OAuth callback |

---

### 2. Landing & Home (Public/Protected)
Entry points for the application.

| Route | Component | Protection | Description |
|-------|-----------|------------|-------------|
| `/` | Landing | Public | Role-based routing (curator→/curator, learner→/home) |
| `/home` | Home | Public | Main home page for learners |

---

### 3. Learner Routes (Protected)
Routes for learners to access and study content.

#### Library & Discovery
| Route | Component | Description |
|-------|-----------|-------------|
| `/library` | MasteryDashboard | Personal library of saved content |
| `/community` | CommunityLibrary | Browse public/shared content |

#### Learning Flow
| Route | Component | Description |
|-------|-----------|-------------|
| `/launchpad/:subjectId` | GymLaunchpad | Content analytics and readiness dashboard |
| `/study/:subjectId` | UnifiedStudyRoom | Active learning interface with tabbed modes |

**Learning Flow:**
1. User selects content from library
2. Navigates to `/launchpad/:subjectId` to view analytics
3. Clicks "Start Learning" → navigates to `/study/:subjectId`
4. Study room provides Overview and Learn tabs

---

### 4. Curator Routes (Admin/Curator Only)
Content Lifecycle Management dashboard for curators and admins.

**Base Route:** `/curator`

All curator routes require `curator` or `admin` role.

| Route | Component | Description |
|-------|-----------|-------------|
| `/curator` | CuratorDashboard (AuditQueueView) | Default: Audit queue |
| `/curator/audits` | AuditQueueView | Content audit queue |
| `/curator/audits/:auditId` | AuditDetailView | Detailed audit view |
| `/curator/analytics` | AnalyticsDashboard | Content analytics |
| `/curator/library` | CuratorLibraryView | Curator's content library |
| `/curator/preview/:subjectId` | CuratorPreview | Preview content with curator tools |
| `/curator/generate` | GenerateLanding | Content generation form |
| `/curator/generate/:subject` | ContentGenerator | Active content generation |

**Curator Flow:**
1. Login as curator → Landing redirects to `/curator`
2. Default view: Audit queue
3. Generate new content: `/curator/generate`
4. Monitor generation: `/curator/generate/:subject`
5. Preview content: `/curator/preview/:subjectId` (with curator tools)
6. View as learner: Click "View as Learner" in preview → `/launchpad/:subjectId`
7. Review audits: `/curator/audits/:auditId`

---

### 5. Development & Fallback

| Route | Component | Description |
|-------|-----------|-------------|
| `/dev` | DevSandbox | Development testing sandbox |
| `*` | NotFound | 404 page for unmatched routes |

---

## Route Protection

### Public Routes
- Authentication routes (`/login`, `/signup`, etc.)
- Landing page (`/`)
- Home page (`/home`)
- Dev sandbox (`/dev`)

### Protected Routes (Requires Authentication)
- All learner routes (`/library`, `/study/*`, `/launchpad/*`)
- All curator routes (`/curator/*`)

### Role-Based Routes
- **Curator/Admin Only:** All `/curator/*` routes
- Protected by `RoleGuard` component with `allowedRoles={['curator', 'admin']}`

---

## Navigation Flow

### For Learners
```
Landing (/) 
  → Home (/home)
    → Library (/library) or Community (/community)
      → Launchpad (/launchpad/:subjectId)
        → Study Room (/study/:subjectId)
```

### For Curators
```
Landing (/)
  → Curator Dashboard (/curator)
    → Generate Content (/curator/generate)
      → Active Generation (/curator/generate/:subject)
    → Review Audits (/curator/audits/:auditId)
    → View Analytics (/curator/analytics)
```

---

## File Organization

### Pages Directory (`src/pages/`)
- Landing.tsx
- Home.tsx
- Login.tsx, SignUp.tsx, etc. (Auth pages)
- MasteryDashboard.tsx (Library)
- CommunityLibrary.tsx
- GymLaunchpad.tsx
- UnifiedStudyRoom.tsx
- CuratorDashboard.tsx
- NotFound.tsx
- DevSandbox.tsx

### CLM Feature Directory (`src/features/clm/pages/`)
- GenerateLanding.tsx
- ContentGenerator.tsx
- CuratorLibraryView.tsx

### CLM Components (`src/features/clm/components/`)
- AuditQueueView.tsx
- AuditDetailView.tsx
- AnalyticsDashboard.tsx
- FindingCard.tsx

---

## Key Principles

1. **Separation of Concerns:** Learner and curator routes are clearly separated
2. **Role-Based Access:** Curator routes protected by role guard
3. **Logical Grouping:** Routes grouped by functionality (auth, learning, management)
4. **Clear Hierarchy:** Nested routes under `/curator` for CLM features
5. **Consistent Naming:** Route names match component names

---

## Migration Notes

### Changes from Previous Structure
- Moved content generation from `/generate` to `/curator/generate`
- Consolidated all CLM routes under `/curator`
- Removed generation access from learner routes
- Clarified route protection and role requirements

### Breaking Changes
- Old `/generate` routes now redirect to `/curator/generate`
- Generation requires curator/admin role
- Learners can no longer generate content directly
