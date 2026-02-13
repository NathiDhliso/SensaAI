# Content Storage

**Last Updated:** February 12, 2026
**Status:** MANDATORY — Understand this before modifying storage flows.

---

## Overview

SensaPBL uses an API-first storage architecture. Concepts are stored in DynamoDB via Lambda during generation and fetched via API endpoints. The frontend no longer writes directly to cloud storage — Lambda handles all persistence. Local storage (IndexedDB + localStorage) provides offline access and session recovery.

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
- `sensapbl-jobs-{dev,prod}` — Generation job tracking
  - TTL: 24 hours

**Access pattern:** Frontend fetches concepts via `conceptsApi.getAllByTier(userId, sessionId, tier)` for each tier (trunk, branch, leaf), then merges results.

### Layer 2: IndexedDB (Offline Cache)

**File:** `src/features/content-storage/local/indexed-db.ts`

Stores full generated documents for offline access. No TTL — persists until user clears browser data. Used as fallback when API is unavailable.

### Layer 3: localStorage (Session Recovery)

**File:** `src/features/content-storage/local/browser-storage.ts`

Stores session progress (current concept, scores, completed concepts). TTL: 24 hours. Throttled saves (2-second interval) with flush-on-unmount to prevent data loss.

### Layer 4: Zustand (Memory)

Active session state lives in Zustand stores. Page lifetime only — lost on refresh (recovered from localStorage).

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
  examObjectives?: string[];
  savedLocally: boolean;
  savedToCloud?: boolean;
  cloudUrl?: string;
  localFilePath?: string;
}
```

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
| `src/shared/api/concepts.ts` | API endpoints for concept fetching |
| `src/shared/utils/content-loader.ts` | Content loading + parsing orchestrator |

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
