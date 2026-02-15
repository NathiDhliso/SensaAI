# SensaAI - AI-Powered Learning Platform

AI-powered educational platform that generates structured learning materials and provides adaptive learning experiences using Claude via AWS Bedrock.

**Built with**: Vite 6.2, React 19, TypeScript 5.9, AWS Bedrock, DynamoDB

---

## Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

**Configuration**: Set environment variables in `.env` (see below) and authenticate via Cognito.

---

## Repository Organization

### Root Structure

```
SensaAI/
├── src/ # Frontend application source code
├── backend/ # Serverless backend (Lambda functions)
├── infra/ # Infrastructure as Code (Terraform, AWS)
├── scripts/ # Development and maintenance scripts
├── config/ # Configuration files (nginx, amplify, models)
├── docs/ # Documentation and historical records
├── public/ # Static assets (images, audio, panoramas)
├── dist/ # Production build output
└── [config files] # Root-level configuration (package.json, tsconfig, etc.)
```

---

## Source Code (`src/`)

The frontend is organized by **business features** (what it does) rather than technical layers (how it works).

### Features (`src/features/`)

Business features - each folder contains everything related to that feature:

```
src/features/
├── content-generation/ # Generate learning content from AI
│ ├── api/ # Backend communication (Lambda, Claude)
│ ├── parsers/ # Parse and transform AI responses
│ ├── validators/ # Validate content quality
│ └── generators/ # Generate specific content types
│
├── content-storage/ # Save and load content
│ ├── cloud/ # S3 + DynamoDB storage
│ ├── local/ # IndexedDB + localStorage
│ └── sync/ # Import/export functionality
│
├── content-audit/ # Syllabus parsing and content auditing
│ ├── audit-engine.ts # Audit logic
│ └── syllabus-parser.ts # Parse syllabus documents
│
├── learning-session/ # Learning activities and progress
│ ├── activities/ # Confusion drills, diagnostics
│ ├── progress/ # Progress tracking and metrics
│ ├── algorithms/ # Spacing, interleaving, selection
│ ├── phases/ # Learning phase AI (Build, Preview, Retain)
│ └── scoring/ # Blank-sheet scoring logic
│
├── personalization/ # User personalization
│ └── components/ # Personalization UI components
│
└── ai-coach/ # AI coach personalities and mood
 ├── personas.ts # Coach personality definitions
 ├── index.ts # Mood system, breathing exercises
 └── components/ # CoachMessage, MoodSelector UI
```

**See**: `src/features/README.md` for detailed feature documentation.

### Shared Code (`src/shared/`)

Reusable utilities used across multiple features:

```
src/shared/
├── api/ # API client and endpoints
├── hooks/ # Reusable React hooks
├── utils/ # Pure utility functions
├── types/ # Shared TypeScript types
├── constants/ # App-wide constants
└── services/ # Shared services (audio, etc.)
```

**See**: `src/shared/README.md` for shared code guidelines.

### Other Directories

```
src/
├── components/ # UI components organized by domain
│ ├── ui/ # Generic UI components
│ ├── learning/ # Learning-specific components
│ ├── generation/ # Generation-specific components
│ ├── auth/ # Authentication components
│ ├── dashboard/ # Dashboard widgets
│ ├── error/ # Error boundaries and fallbacks
│ ├── layout/ # App layout and navigation
│ ├── settings/ # Settings panels
│ └── storage/ # Storage-related components
│
├── pages/ # Full page views (routes)
│ ├── Home.tsx # Landing page
│ ├── Generate.tsx # Content generation page
│ ├── Study.tsx # Learning session page
│ ├── VelocityLearning.tsx # Velocity learning mode
│ ├── SavedResults.tsx # Library of saved content
│ ├── CommunityLibrary.tsx # Community-shared content
│ ├── DocumentView.tsx # Document viewer
│ ├── Login.tsx # Login page
│ ├── SignUp.tsx # Registration page
│ ├── ConfirmSignUp.tsx # Email confirmation
│ ├── ForgotPassword.tsx # Password reset
│ └── AuthCallback.tsx # OAuth callback handler
│
├── store/ # Global state management (Zustand)
│ ├── auth-store.ts # Authentication state
│ ├── learning-store.ts # Learning session state
│ ├── generation-store.ts # Generation state
│ ├── personalization-store.ts # User preferences
│ ├── theme-store.ts # Theme/visual mode state
│ ├── ui-store.ts # UI layout state
│ └── slices/ # Composable store slices
│ ├── createCognitiveSlice.ts
│ ├── createDiagnosticSlice.ts
│ ├── createFocusSlice.ts
│ ├── createNavigationSlice.ts
│ ├── createSessionSlice.ts
│ ├── createStudySlice.ts
│ └── createUISlice.ts
│
├── styles/ # Global styles (animations)
└── App.tsx # Main app component and routing
```

---

## Backend (`backend/`)

Serverless backend built with AWS Lambda and DynamoDB:

```
backend/
├── src/ # Express proxy server (TypeScript)
│ ├── core/ # Express app, routes, server entry
│ ├── features/ # Auth, concepts, content, gym, proxy routes
│ └── shared/ # Middleware (JWT, rate-limit), types
│
├── lambda/ # Python Lambda functions
│ ├── generate_concepts/ # Concept generation (Bedrock)
│ ├── query_concepts/ # Paginated queries, job polling
│ ├── gym_ai/ # Gym activity AI (Haiku)
│ ├── custom_message/ # Cognito custom message trigger
│ ├── shared/ # system_prompt.py, utils.py
│ └── auth/ # Auth Lambda
└── scripts/ # Backend utility scripts
```

**Key Features**:
- Serverless content generation via AWS Bedrock
- DynamoDB for concept storage
- API Gateway for REST endpoints
- Background job processing

---

## Infrastructure (`infra/`)

Infrastructure as Code and deployment configurations:

```
infra/
├── terraform/ # Terraform configurations for AWS resources
├── scripts/ # Deployment and setup scripts
├── client_info.json # AWS client configuration
└── sensaai-storage-policy.json # S3 bucket policies
```

**Managed Resources**:
- DynamoDB tables (`sensapbl-concepts-{env}`, `sensapbl-jobs-{env}`)
- S3 buckets (content storage)
- Lambda functions
- API Gateway
- Cognito (authentication)

---

## Scripts (`scripts/`)

Development and maintenance scripts:

```
scripts/
├── check-*.ps1 # Code quality checks (PowerShell)
├── scan-*.js # Code analysis tools (JavaScript)
├── generate-*.js # Code generation utilities
└── run-all-checks.ps1 # Run all quality checks
```

**Available Checks**:
- `check-any-types.ps1` - Find TypeScript `any` types
- `check-console-logs.ps1` - Find console.log statements
- `check-hardcoded-colors.ps1` - Find hardcoded color values
- `check-hardcoded-subjects.ps1` - Find hardcoded subject references
- `check-css-var-prefixes.ps1` - Verify CSS variable naming conventions
- `check-magic-timeouts.ps1` - Find magic number timeouts
- `scan-css-conflicts.js` - Find CSS conflicts
- `scan-duplicate-css-properties.js` - Find duplicate CSS properties
- `run-all-checks.ps1` - Run all checks at once

**Generators**:
- `generate-map.js` - Generate project map
- `generate_project_map.js` - Generate detailed project map
- `generate-voices.js` - Generate AI coach voice data

---

## Configuration (`config/`)

Application configuration files:

```
config/
├── amplify.yml # AWS Amplify deployment config
├── models.json # AI model configurations
└── nginx.conf # Nginx server configuration
```

---

## Documentation (`docs/`)

Project documentation — see `docs/README.md` for the reading guide:

```
docs/
├── README.md # Documentation index and reading order
├── master-prompt.md # Project overview, routes, stores, key files
├── type-system.md # LearningConcept contract, Bloom's taxonomy
├── generation-pipeline.md # Prompt → Lambda → parser → store → UI
├── learning-science.md # 3-phase loop, mood curation, algorithms
├── authentication.md # Cognito OAuth PKCE, session management
├── content-storage.md # StorageManager, DynamoDB, IndexedDB, sync
├── implementation-guide.md # Code patterns, checklists
├── styling-specifications.md # CSS variable catalog, theme system
├── VISUAL_THEME_SYSTEM.md # Playful vs Scholarly modes
├── metaphor-system.md # useMetaphorContent hook, data flow
├── DESIRABLE_RESULTS.md # Field-by-field quality examples
├── GYM_UX_PHILOSOPHY.md # Gym activity design principles
└── MASTERY_SCORING_GUIDE.md # Grade thresholds (S/A/B/C/D)
```

---

## Key Features

### Content Generation
- **Multi-Phase Generation System**: Domain Analysis → Tree Generation (per domain, parallel) → Automatic Gap-Fill Pass
- **Exam-Context Tree Structure**: Trunk/Branch/Leaf hierarchy with TRACES connections
- **AWS Bedrock Integration**: Claude Sonnet 4 via AWS Bedrock Runtime
- **Real-time Streaming**: Progress updates during generation
- **Quality Metrics**: Lifecycle consistency, positive framing, format consistency

### Learning Experience
- **Adaptive Learning**: Spaced repetition and interleaving algorithms
- **Multiple Activities**: Blank sheet tests, confusion drills, mastery challenges
- **AI Coach**: Multiple coach personalities with mood-based adjustments
- **Progress Tracking**: Session progress, mastery levels, concept dependencies
- **Offline Support**: IndexedDB caching for offline learning

### Storage & Sync
- **Cloud Storage**: DynamoDB for concepts, S3 for documents
- **Local Cache**: IndexedDB for offline access
- **Import/Export**: JSON, PDF, Markdown formats
- **Session Recovery**: Background job recovery for interrupted generations

---

## Environment Variables

Create a `.env` file in the root directory:

```env
# AWS Configuration
VITE_AWS_REGION=us-east-1

# Cognito Configuration
VITE_COGNITO_USER_POOL_ID=your_user_pool_id
VITE_COGNITO_CLIENT_ID=your_client_id
VITE_COGNITO_DOMAIN=sensapbl-dev.auth.us-east-1.amazoncognito.com

# API Configuration
VITE_API_URL=https://your-api-gateway-url
```

**See**: `.env.example` for a complete list of environment variables.

**Amplify Sync**: After any Terraform apply, run `push-amplify-env.ps1` to sync frontend env vars from the deployed Lambda config:
```powershell
.\infra\scripts\push-amplify-env.ps1 -Environment prod -TriggerBuild
```

---

## Development

### Available Commands

```bash
# Development
npm run dev # Start dev server (http://localhost:5173)
npm run build # Build for production
npm run preview # Preview production build

# Code Quality
npm run lint # Run ESLint
npm run type-check # Run TypeScript compiler check
scripts/run-all-checks.ps1 # Run all quality checks

# Backend
cd backend
npm run build # Build Lambda functions
npm run deploy # Deploy to AWS
```

### Code Quality Standards

- **TypeScript**: Strict mode enabled, no `any` types
- **ESLint**: Enforced code style and best practices
- **CSS**: Modular CSS with consistent naming
- **No Console Logs**: Use proper logging in production
- **No Magic Numbers**: Use named constants

---

## Architecture

### Frontend Architecture
- **Framework**: React 19 with TypeScript 5.9
- **Build Tool**: Vite 6.2
- **State Management**: Zustand with persist middleware + composable slices
- **Server State**: TanStack React Query
- **Routing**: React Router 7
- **Styling**: Tailwind CSS 4 + Modular CSS with CSS variables
- **Animations**: Framer Motion
- **UI Primitives**: Radix UI (Dialog, Tabs, Tooltip, Progress)
- **Charts**: Recharts
- **Validation**: Zod
- **Icons**: Lucide React

### Backend Architecture
- **Runtime**: Python 3.12 on AWS Lambda
- **Proxy Server**: Express (TypeScript) with Helmet, CORS, JWT verification
- **Database**: DynamoDB (NoSQL)
- **Storage**: S3 for documents
- **AI**: AWS Bedrock (Claude Sonnet 4)
- **Auth**: AWS Cognito (OAuth PKCE)
- **API**: API Gateway (REST)

### Data Flow
1. User generates content Frontend calls API Gateway
2. API Gateway triggers Lambda function
3. Lambda calls AWS Bedrock for AI generation
4. Generated concepts stored in DynamoDB
5. Frontend fetches concepts and displays to user
6. User progress tracked in DynamoDB
7. Offline cache in IndexedDB for performance

---

## Dependencies

### Frontend
- **react** ^19.2.0 - UI framework
- **react-router-dom** ^7.1.0 - Routing
- **zustand** ^5.0.0 - State management
- **@tanstack/react-query** ^5.62.0 - Server state management
- **framer-motion** ^11.15.0 - Animations
- **tailwindcss** ^4.0.0 - CSS framework
- **@radix-ui/react-dialog, tabs, tooltip, progress** - UI primitives
- **recharts** ^3.6.0 - Charts and graphs
- **zod** ^3.25.76 - Schema validation
- **sonner** ^2.0.7 - Toast notifications
- **lucide-react** ^0.469.0 - Icons
- **d3-hierarchy** ^3.1.2 - Tree visualizations
- **jspdf** + **html2canvas** - PDF export
- **pdfjs-dist** ^5.4.530 - PDF viewing
- **markdown-it** ^14.1.0 - Markdown rendering
- **pannellum** ^2.5.6 - 360° panorama viewer
- **@react-google-maps/api** ^2.20.8 - Google Maps
- **@aws-sdk/client-bedrock-runtime** - AWS Bedrock client

### Backend (Express Proxy - TypeScript)
- **express** ^4.21.0 - HTTP server
- **helmet** ^8.0.0 - Security headers
- **cors** ^2.8.5 - CORS middleware
- **cookie-parser** ^1.4.7 - Cookie parsing
- **jsonwebtoken** + **jwks-rsa** - JWT verification
- **dotenv** ^17.2.3 - Environment configuration
- **uuid** ^10.0.0 - ID generation
- **@aws-sdk/client-dynamodb** - DynamoDB operations
- **@aws-sdk/client-s3** - S3 operations
- **@aws-sdk/client-lambda** - Lambda invocation
- **@aws-sdk/client-cognito-identity-provider** - Cognito operations
- **@aws-sdk/client-secrets-manager** - Secrets management

### Backend (Lambda - Python 3.12)
- **boto3** - AWS SDK (Bedrock, DynamoDB, Lambda self-invocation)

**See**: `package.json` for complete dependency list.

---

## Deployment

### Frontend Deployment (AWS Amplify)
```bash
# Build production bundle
npm run build

# Deploy to Amplify (automatic via Git push)
git push origin main
```

### Backend Deployment (AWS Lambda)
```bash
cd backend
npm run build
npm run deploy
```

### Infrastructure Deployment (Terraform)
```bash
cd infra/terraform/environments/dev   # or prod
terraform init
terraform plan -out=tfplan
terraform apply "tfplan"
```

### Sync Amplify After Terraform
```powershell
.\infra\scripts\push-amplify-env.ps1 -Environment prod -TriggerBuild
```
This reads Cognito config from the deployed auth Lambda (source of truth), validates the pool exists, and pushes all values to Amplify.

---

## Navigation Guide

### Finding Code

**Q: Where's the content generation code?** 
A: `src/features/content-generation/`

**Q: Where's the storage code?** 
A: `src/features/content-storage/`

**Q: Where's the learning session code?** 
A: `src/features/learning-session/`

**Q: Where are shared utilities?** 
A: `src/shared/`

**Q: Where are UI components?** 
A: `src/components/`

**Q: Where's the backend code?** 
A: `backend/src/`

**Q: Where's the infrastructure code?** 
A: `infra/terraform/`

---

## Additional Documentation

- **Features Guide**: `src/features/README.md`
- **Shared Code Guide**: `src/shared/README.md`
- **UX Improvements**: `UX_IMPROVEMENTS_SUMMARY.md`

---

## Contributing

1. Follow the feature-based organization structure
2. Add new features to `src/features/`
3. Add shared utilities to `src/shared/`
4. Run quality checks before committing
5. Update documentation as needed

---

## License

MIT

---

## Acknowledgments

Built with modern web technologies and AWS services to provide an adaptive, AI-powered learning experience.

**Last Updated**: February 15, 2026 
**Repository Organization**: Feature-based structure for clarity and maintainability
