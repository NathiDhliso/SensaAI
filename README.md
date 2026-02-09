# SensaPBL - AI-Powered Learning Platform

AI-powered educational platform that generates structured learning materials and provides adaptive learning experiences using Claude via AWS Bedrock.

**Built with**: Vite 6.0, React 19, TypeScript 5.7+, AWS Bedrock, DynamoDB

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

**Configuration**: Navigate to Settings and enter your AWS Bedrock credentials (API key and region).

---

## Repository Organization

### Root Structure

```
SensaPBL/
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
├── learning-session/ # Learning activities and progress
│ ├── activities/ # Confusion drills, diagnostics
│ ├── progress/ # Progress tracking and metrics
│ ├── algorithms/ # Spacing, interleaving, selection
│ └── phases/ # Learning phase AI (Build, Preview, Retain)
│
└── ai-coach/ # AI coach personalities and voice
 ├── personas.ts # Coach personality definitions
 └── voice/ # Voice lines and audio
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
│ └── ...
│
├── pages/ # Full page views (routes)
│ ├── Home.tsx # Landing page
│ ├── Generate.tsx # Content generation page
│ ├── Study.tsx # Learning session page
│ ├── SavedResults.tsx # Library of saved content
│ └── ...
│
├── store/ # Global state management (Zustand)
│ ├── auth-store.ts # Authentication state
│ ├── learning-store.ts # Learning session state
│ ├── generation-store.ts # Generation state
│ └── ...
│
├── contexts/ # React contexts
├── styles/ # Global styles
└── App.tsx # Main app component and routing
```

---

## Backend (`backend/`)

Serverless backend built with AWS Lambda and DynamoDB:

```
backend/
├── src/
│ ├── handlers/ # Lambda function handlers
│ ├── services/ # Business logic services
│ ├── shared/ # Shared utilities and types
│ └── lib/ # Libraries (system prompts, etc.)
│
├── lambda/ # Lambda deployment packages
├── data/ # Data files and fixtures
└── dist/ # Compiled JavaScript output
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
└── sensapbl-storage-policy.json # S3 bucket policies
```

**Managed Resources**:
- DynamoDB tables (concepts, sessions, users)
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
- `check-magic-timeouts.ps1` - Find magic number timeouts
- `scan-css-conflicts.js` - Find CSS conflicts
- `run-all-checks.ps1` - Run all checks at once

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

Project documentation and historical records:

```
docs/
├── archive/ # Archived documentation
│ ├── FOLDER_REORGANIZATION_COMPLETE.md
│ ├── FOLDER_REORGANIZATION_PLAN.md
│ └── REORGANIZATION_SUCCESS.md
│
└── cleanup-history/ # Historical cleanup records
 ├── PHASE_2_COMPLETE.md
 ├── PHASE_3_COMPLETE.md
 ├── CLEANUP_SUMMARY.md
 ├── COMPLEXITY_AUDIT.md
 ├── FEATURES_STATUS.md
 ├── SELF_HEALING_ANALYSIS.md
 └── SELF_HEALING_REMOVAL_COMPLETE.md
```

---

## Key Features

### Content Generation
- **4-Pass Generation System**: Domain Analysis Dependency Mapping Content Generation Quality Validation
- **Universal Lifecycle Enforcement**: 7 domains with 3-phase lifecycles
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
VITE_AWS_ACCESS_KEY_ID=your_access_key
VITE_AWS_SECRET_ACCESS_KEY=your_secret_key

# Cognito Configuration
VITE_COGNITO_USER_POOL_ID=your_user_pool_id
VITE_COGNITO_CLIENT_ID=your_client_id

# API Configuration
VITE_API_BASE_URL=https://your-api-gateway-url
```

**See**: `.env.example` for a complete list of environment variables.

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
- **Framework**: React 19 with TypeScript 5.7+
- **Build Tool**: Vite 6.0
- **State Management**: Zustand with persist middleware
- **Routing**: React Router 7
- **Styling**: Modular CSS with CSS variables
- **Icons**: Lucide React

### Backend Architecture
- **Runtime**: Node.js 18+ on AWS Lambda
- **Database**: DynamoDB (NoSQL)
- **Storage**: S3 for documents
- **AI**: AWS Bedrock (Claude Sonnet 4)
- **Auth**: AWS Cognito
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
- **react** ^19.0.0 - UI framework
- **react-router-dom** ^7.1.1 - Routing
- **zustand** ^5.0.2 - State management
- **lucide-react** ^0.468.0 - Icons
- **@aws-sdk/client-bedrock-runtime** - AWS Bedrock client

### Backend
- **@aws-sdk/client-dynamodb** - DynamoDB client
- **@aws-sdk/client-s3** - S3 client
- **@aws-sdk/client-bedrock-runtime** - Bedrock client

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
cd infra/terraform
terraform init
terraform plan
terraform apply
```

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
- **Reorganization History**: `docs/archive/`
- **Cleanup History**: `docs/cleanup-history/`

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

**Last Updated**: January 29, 2026 
**Repository Organization**: Feature-based structure for clarity and maintainability
