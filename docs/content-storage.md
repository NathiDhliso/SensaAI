# Content Storage

**Last Updated:** February 16, 2026
**Status:** MANDATORY — Understand this before modifying storage flows.

---

## Overview

SensaAI uses an API-first storage architecture. Concepts are stored in DynamoDB via Lambda during generation and fetched via API endpoints. The frontend no longer writes directly to cloud storage — Lambda handles all persistence. Local storage (IndexedDB + localStorage) provides offline access and session recovery.

---

## Storage Architecture

```
                    ┌─────────────────────────────┐
                    │      Lambda (Generate)       │
                    │  Writes concepts to DynamoDB │
                    └──────────────┬──────────────┘
                                   │
                    ┌──────────────▼──────────────┐
                    │        DynamoDB              │
                    │  sensapbl-concepts-{env}     │
                    │  sensapbl-jobs-{env}         │
                    └──────────────┬──────────────┘
                                   │
                    ┌──────────────▼──────────────┐
                    │   Express Backend (Proxy)    │
                    │  /api/v1/concepts/*          │
                    └──────────────┬──────────────┘
                                   │
          ┌────────────────────────▼────────────────────────┐
          │                   Frontend                       │
          │                                                  │
          │  ┌─────────────┐  ┌──────────┐  ┌────────────┐ │
          │  │ StorageManager│  │ IndexedDB│  │ localStorage│ │
          │  │ (API fetch)  │  │ (offline)│  │ (session)  │ │
          │  └─────────────┘  └──────────┘  └────────────┘ │
          └─────────────────────────────────────────────────┘
```

---

## Storage Layers

### Layer 1: DynamoDB (Cloud Truth)

**Tables:**
- `sensapbl-concepts-{dev,prod}` — All generated concepts
  - **PK:** `USER#{userId}#SESSION#{sessionId}`
  - **SK:** `TIER#{tier}#CONCEPT#{conceptId}` or `SUBJECT#{sessionId}`
  - **GSI1:** Tier-based queries
  - **TTL:** 168 hours (7 days)
- `sensapbl-jobs-{dev,prod}` — Generation job tracking
  - TTL: 24 hours

**Access pattern:** Frontend fetches concepts via `conceptsApi.getAllByTier(userId, sessionId, tier)` for each tier (trunk, branch, leaf), then merges results.

### Layer 2: IndexedDB (Offline Cache)

**File:** `src/features/content-storage/local/indexed-db.ts`

Stores full generated documents for offline access. No TTL — persists until user clears browser data. Used as fallback when API is unavailable.

### Layer 3: localStorage (Session Recovery)

**File:** `src/features/content-storage/local/browser-storage.ts`

Stores session progress (current concept, scores, completed concepts). TTL: 24 hours. Throttled saves (2-second interval) with flush-on-unmount to prevent data loss.

### Layer 3b: localStorage (Activity Draft Autosave)

**File:** `src/shared/hooks/useActivityAutosave.ts`

Persists in-progress learning activity state so no work is lost on refresh, navigation, or accidental tab close. Uses the `sensa-activity-draft:{key}:{sessionId}` namespace.

| Draft Key | Activity | What's Saved |
|-----------|----------|--------------|
| `concept-map` | ConceptMapBuilder | Nodes + connections (full `ConceptMapData`) |
| `blank-sheet` | BlankSheetTest | Response text + concept ID |
| `mastery` | MasteryChallenge | (reserved for future use) |
| `explore-guesses` | SessionScoutPreview | (reserved for future use) |

**Behavior:**
- Throttled writes (2-second interval) matching session-tracker pattern
- Immediate flush on `beforeunload` + component unmount
- 24h TTL with auto-cleanup on app init (`cleanupExpiredActivityDrafts()` in `learning-store.ts`)
- Draft cleared on successful `onComplete` — only in-progress work is stored
- All keys registered in `src/shared/constants/storage-keys.ts` (`STORAGE_KEYS.DRAFT_*`)

### Layer 4: Zustand (Memory + Persist)

Active session state lives in Zustand stores. The `useLearningStore` is persisted to localStorage via `zustand/middleware/persist`, meaning the `currentSession`, `studySession` (including `conceptMap` and `equation` values), and focus settings survive page refresh. The `useSensaFlow` hook restores equation values (G, Q_P, Q_M, Q_f, I) and concept map data from the persisted `studySession` via `syncFromStore()`.

---

## StorageManager

**File:** `src/features/content-storage/manager.ts`

The `StorageManager` class is the primary interface for loading saved results. It follows an API-first approach:

```
loadResult(id)
  → Fetch job status from API (conceptsApi.getJobStatus)
  → Resolve userId, sessionId, subject from job metadata
  → Fetch concepts by tier (trunk, branch, leaf) in parallel
  → If no concepts found, retry with jobId as fallback sessionId
  → Build document from concepts (buildDocumentFromConcepts)
  → Construct SavedResult with metadata + classification
  → Return SavedResult
```

`saveResult()` is deprecated — Lambda handles all storage during generation.

---

## SavedResult Type

```typescript
interface SavedResult {
  id: string;
  subject: string;
  alias?: string;             // 3 letters + 2 digits version ID
  generatedAt: string;
  fullDocument: string;        // Raw JSON document
  pass1Data: {
    domain: string;
    roleScope: string;
    lifecycle: { phase1, phase2, phase3: string };
    concepts: string[];
  };
  validation: {
    lifecycleConsistency: number;
    positiveFraming: number;
    formatConsistency: number;
    completeness: number;
  };
  isPublic?: boolean;
  savedLocally?: boolean;
  savedToCloud?: boolean;
}
```

---

## Community Library (Public Content)

Users can share generated content with other logged-in users via the Community Library.

**Backend (query_concepts handler):**
- `toggle_public` — Sets `isPublic` boolean on a job record in the jobs table
- `list_public` — Scans jobs table for all `isPublic=true` + `status=completed` records
- `get_public_content` — Fetches concepts for a public job (verifies `isPublic` flag)

**Frontend:**
- `SavedResults.tsx` — Globe toggle button on each card to share/unshare
- `CommunityLibrary.tsx` — Browse page at `/community` showing all public content
- `conceptsApi.togglePublic()`, `conceptsApi.listPublic()`, `conceptsApi.getPublicContent()`

**Data model:** `isPublic` boolean field on the jobs table (`sensapbl-jobs-{env}`). No GSI — uses scan with filter (acceptable for community-scale traffic).

---

## Data Flow: Save (Generation)

```
1. User starts generation on Generate.tsx
2. useGenerationEngine calls conceptsApi.generate()
3. Express proxies to Lambda (generate_concepts)
4. Lambda generates concepts via Bedrock
5. Lambda stores concepts directly in DynamoDB (dynamo_service.py)
6. Lambda creates job record in jobs table
7. Frontend polls job status via conceptsApi.getJobStatus()
8. On completion, frontend fetches concepts via conceptsApi.getAllByTier()
9. Frontend parses and transforms into LearningConcept[]
10. Optionally saved to IndexedDB for offline access
```

---

## Data Flow: Load (Study Session)

```
1. User navigates to /study/:subjectId or /launchpad/:subjectId
2. Content loader calls StorageManager.loadResult(subjectId)
3. StorageManager fetches job status + concepts from API
4. Concepts transformed via buildDocumentFromConcepts()
5. Result parsed via parseGeneratedContent() → LearningConcept[]
6. Loaded into learning-store via loadSession()
7. Session progress restored from localStorage if available
```

---

## Sync Engine

**File:** `src/features/content-storage/sync/sync-engine.ts`

Handles synchronization between cloud and local storage:
- Resolves conflicts between local and cloud versions
- Manages import/export of generated content
- Provides `importFromFile()` for loading exported documents

### Import

**File:** `src/features/content-storage/sync/import.ts`

- `importFromFile()` — Parses uploaded JSON files into SavedResult format
- `createFileInput()` — Creates hidden file input for browser upload

---

## Cloud Storage (Legacy)

**File:** `src/features/content-storage/cloud/s3-dynamodb.ts`

The `CloudStorage` class provides direct S3/DynamoDB access. Currently exported but NOT used by StorageManager — all concept persistence goes through Lambda. Kept for potential future direct-upload features (e.g., user attachments).

---

## Key Files

| File | Purpose |
|------|---------|
| `src/features/content-storage/manager.ts` | StorageManager — API-first load, deprecated save |
| `src/features/content-storage/types.ts` | SavedResult, StorageProvider interfaces |
| `src/features/content-storage/cloud/s3-dynamodb.ts` | Direct cloud access (legacy, not active) |
| `src/features/content-storage/local/indexed-db.ts` | IndexedDB offline cache |
| `src/features/content-storage/local/browser-storage.ts` | localStorage session recovery |
| `src/features/content-storage/sync/sync-engine.ts` | Cloud ↔ local synchronization |
| `src/features/content-storage/sync/import.ts` | File import utilities |
| `src/features/content-storage/index.ts` | Barrel exports |
| `src/shared/hooks/useActivityAutosave.ts` | Activity draft autosave hook (throttled localStorage) |
| `src/shared/constants/storage-keys.ts` | Centralized localStorage key constants |
| `src/shared/api/concepts.ts` | API endpoints for concept fetching (see full API surface below) |
| `src/shared/utils/content-loader.ts` | Content loading + parsing orchestrator |

---

## Concepts API Surface (`src/shared/api/concepts.ts`)

| Method | Signature | Description |
|--------|-----------|-------------|
| `query` | `query(params: ConceptsQueryParams)` | Paginated concept fetch with optional tier filter |
| `generate` | `generate(request: GenerateConceptsRequest)` | Start async concept generation (returns jobId) |
| `suggestStructure` | `suggestStructure(request)` | AI-powered domain suggestion for a subject |
| `repair` | `repair({ subject, conceptName, issue, userId })` | Surgically fix a single concept |
| `deleteJob` | `deleteJob(sessionId, userId)` | Delete a subject and all its concepts |
| `listJobs` | `listJobs(userId)` | List all generation jobs for a user |
| `getJobStatus` | `getJobStatus(jobId, userId?)` | Check status of a generation job |
| `getAllByTier` | `getAllByTier(userId, sessionId, tier)` | Fetch all concepts for a tier (auto-paginates) |
| `getJobProgress` | `getJobProgress(userId, jobId)` | Real-time progress of a streaming generation job |
| `getLatestConcepts` | `getLatestConcepts(userId, sessionId, afterOrder, limit)` | Incremental polling — concepts added after a specific order |
| `pollForConcepts` | `pollForConcepts(userId, sessionId, onConcept, onProgress, interval, abort)` | Full streaming poll loop with callbacks and abort support |

### Streaming Generation Support

During generation, the frontend can show live progress:
1. `getJobProgress()` returns `{ status, conceptCount, latestConcept, updatedAt }`
2. `getLatestConcepts()` returns concepts with `order > afterOrder` for incremental fetching
3. `pollForConcepts()` wraps both into a polling loop that yields concepts via `onConcept` callback, reports progress via `onProgress`, and stops on completion/failure/abort

Key types: `JobProgress`, `LatestConceptsResponse`, `JobSummary`, `JobStatus`.

---

## Exam Catalog System

**Directory:** `src/shared/constants/exam-catalogs/`

Provides structured exam objectives that drive the gap-fill pipeline:

| File | Provider | Count |
|------|----------|-------|
| `aws.ts` | AWS | 13 certs |
| `microsoft.ts` | Microsoft | 9 certs |
| `comptia.ts` | CompTIA | 6 certs |
| `google-cloud.ts` | Google Cloud | 5 certs |
| `cisco.ts` | Cisco | 2 certs |
| `pmi.ts` | PMI | 3 certs |
| `isc2.ts` | ISC2 | 4 certs |
| **Total** | | **42 certs** |

- `types.ts` — `CertProvider`, `CertLevel`, `CertDomain`, `CertEntry` types
- `index.ts` — exports `ALL_CERTS`, `CERT_PROVIDERS`
- Each cert entry has `name`, `code`, `level`, `domains[]` with `tasks[]` and `weight`
- Home.tsx unified search searches ALL_CERTS by name/code/provider
- When a cert is selected, its domains become trunks and its tasks become context (objectives)

---

## Forbidden Patterns

```typescript
// NEVER write concepts directly to DynamoDB from frontend
cloudStorage.putItem(concept); // FORBIDDEN — Lambda handles all writes

// NEVER skip the API layer
const raw = await dynamoClient.query(...); // FORBIDDEN — use conceptsApi

// NEVER store tokens or sensitive data in IndexedDB
indexedDB.save({ tokens: ... }); // FORBIDDEN — tokens are in HttpOnly cookies

// NEVER rely on localStorage for critical data
// It's a recovery mechanism, not primary storage
// Always fetch from API first, fall back to local
```
