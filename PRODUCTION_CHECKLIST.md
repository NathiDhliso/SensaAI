# Production Readiness Checklist

## Critical Issues (Must Fix Before Production)

### 1. Environment Variables
**Status:** ⚠️ NEEDS ATTENTION

**Issue:** Hardcoded localhost in redirect URI
```env
VITE_COGNITO_REDIRECT_URI=http://localhost:5173/auth/callback
```

**Fix Required:**
- Create `.env.production` with production URLs
- Update redirect URI to production domain
- Configure Cognito to allow production callback URL

**Example `.env.production`:**
```env
VITE_COGNITO_REDIRECT_URI=https://yourdomain.com/auth/callback
```

---

### 2. Backend CORS Configuration
**Status:** ⚠️ NEEDS ATTENTION

**Location:** `backend/src/core/server.ts`

**Issue:** CORS defaults to localhost
```typescript
origin: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:5173']
```

**Fix Required:**
- Set `CORS_ORIGINS` environment variable in production
- Include production domain(s)

**Example:**
```env
CORS_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
```

---

### 3. Role-Based Access Control
**Status:** ⚠️ INCOMPLETE

**Location:** `backend/src/features/clm/routes/curator.ts`

**Issue:** Role checking not implemented
```typescript
function isCurator(req: Request): boolean {
  // TODO: Implement role checking based on your auth system
  return true; // Currently allows all users!
}
```

**Fix Required:**
- Implement proper JWT token validation
- Extract and verify `custom:role` attribute from Cognito token
- Return false for non-curator users

**Suggested Implementation:**
```typescript
function isCurator(req: Request): boolean {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return false;
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const role = decoded['custom:role'];
    return role === 'curator' || role === 'admin';
  } catch {
    return false;
  }
}
```

---

### 4. Incomplete Features
**Status:** ⚠️ NEEDS IMPLEMENTATION

**Locations:**
- `src/features/clm/pages/CuratorPreview.tsx`
  - Edit content functionality (placeholder)
  - Run audit functionality (placeholder)

**Fix Required:**
- Implement edit interface or remove button
- Implement audit trigger or remove button
- Or clearly mark as "Coming Soon"

---

## Important Issues (Should Fix)

### 5. Console Logging
**Status:** ⚠️ CLEANUP NEEDED

**Issue:** Excessive console.log statements throughout codebase

**Impact:** 
- Performance overhead in production
- Potential information leakage
- Cluttered browser console

**Fix Options:**

**Option A: Remove all console.logs**
```bash
# Find and review all console.log statements
grep -r "console.log" src/
```

**Option B: Use environment-aware logging**
```typescript
// Create src/shared/utils/logger.ts
export const logger = {
  log: (...args: any[]) => {
    if (import.meta.env.DEV) {
      console.log(...args);
    }
  },
  error: (...args: any[]) => {
    console.error(...args); // Always log errors
  },
  warn: (...args: any[]) => {
    if (import.meta.env.DEV) {
      console.warn(...args);
    }
  }
};

// Replace console.log with logger.log
```

---

### 6. Error Tracking
**Status:** ⚠️ NOT IMPLEMENTED

**Location:** `src/components/error/LearningErrorBoundary.tsx`

**Issue:** No error tracking service integration
```typescript
// TODO: Send to error tracking service (e.g., Sentry)
```

**Recommendation:**
- Integrate Sentry or similar service
- Track production errors
- Monitor user experience issues

**Example Sentry Setup:**
```typescript
import * as Sentry from "@sentry/react";

Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  environment: import.meta.env.MODE,
  enabled: import.meta.env.PROD
});
```

---

### 7. Health Check Endpoints
**Status:** ⚠️ INCOMPLETE

**Location:** `backend/src/core/routes/health.ts`

**Issue:** Database and Redis checks not implemented
```typescript
async function checkDatabase(): Promise<{ healthy: boolean; latency?: number }> {
  // TODO: Implement actual database check
  return { healthy: true, latency: 5 };
}
```

**Fix Required:**
- Implement actual DynamoDB health check
- Add connection pool monitoring
- Return real health status

---

## Security Issues

### 8. AWS Credentials
**Status:** ✅ RESOLVED (from previous session)

**Action Taken:**
- Removed credentials from Git history
- Added to .gitignore
- Created secrets management guide

**Verify:**
- Credentials rotated
- No secrets in repository
- Terraform uses secure credential management

---

### 9. Authentication Token Storage
**Status:** ✅ GOOD (using Amplify)

**Current Implementation:**
- Tokens stored securely by AWS Amplify
- Automatic token refresh
- Secure cookie handling

---

## Performance Issues

### 10. Bundle Size
**Status:** ℹ️ SHOULD MONITOR

**Recommendation:**
- Run production build and analyze bundle size
- Check for large dependencies
- Implement code splitting if needed

**Commands:**
```bash
npm run build
npx vite-bundle-visualizer
```

---

### 11. Lazy Loading
**Status:** ✅ GOOD

**Current Implementation:**
- Routes are lazy loaded
- Components loaded on demand
- Good code splitting strategy

---

## Configuration Issues

### 12. Environment-Specific Configs
**Status:** ⚠️ NEEDS SETUP

**Required Files:**
- `.env.production` (production environment variables)
- `.env.staging` (staging environment variables)

**Must Include:**
- Production API URLs
- Production Cognito settings
- Production S3 bucket names
- Production DynamoDB table names

---

### 13. Build Configuration
**Status:** ℹ️ VERIFY

**Check:**
- Vite production build settings
- Source maps (disable in production or upload to error tracking)
- Minification enabled
- Tree shaking working

**Vite Config Check:**
```typescript
// vite.config.ts
export default defineConfig({
  build: {
    sourcemap: false, // or 'hidden' for error tracking
    minify: 'terser',
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom']
        }
      }
    }
  }
});
```

---

## Deployment Issues

### 14. Backend Deployment
**Status:** ℹ️ NEEDS VERIFICATION

**Checklist:**
- [ ] Backend deployed to production environment
- [ ] Environment variables configured
- [ ] Database connections working
- [ ] Lambda functions deployed
- [ ] API Gateway configured
- [ ] CORS properly set

---

### 15. Frontend Deployment
**Status:** ℹ️ NEEDS VERIFICATION

**Checklist:**
- [ ] Build process tested
- [ ] Static assets uploaded to S3/CDN
- [ ] CloudFront/CDN configured
- [ ] SSL certificate installed
- [ ] Domain configured
- [ ] Redirect rules set up

---

## Testing Issues

### 16. E2E Tests
**Status:** ⚠️ SOME SKIPPED

**From Previous Session:**
- 15 tests passing
- 6 tests skipped (rendering issues in test environment)

**Recommendation:**
- Fix skipped tests or document why they're skipped
- Add production smoke tests
- Test critical user flows

---

### 17. Load Testing
**Status:** ❌ NOT DONE

**Recommendation:**
- Test concurrent user load
- Test content generation under load
- Monitor Lambda cold starts
- Check DynamoDB throughput

---

## Monitoring & Observability

### 18. Application Monitoring
**Status:** ❌ NOT IMPLEMENTED

**Needed:**
- Application performance monitoring (APM)
- User session tracking
- Error rate monitoring
- API latency tracking

**Recommended Tools:**
- Sentry (errors)
- CloudWatch (AWS metrics)
- LogRocket or FullStory (session replay)

---

### 19. Logging Strategy
**Status:** ⚠️ INCONSISTENT

**Issues:**
- Mix of console.log and proper logging
- No structured logging
- No log aggregation

**Recommendation:**
- Implement structured logging
- Use CloudWatch Logs
- Set up log retention policies

---

## Documentation Issues

### 20. API Documentation
**Status:** ⚠️ INCOMPLETE

**Needed:**
- API endpoint documentation
- Authentication flow documentation
- Error response formats
- Rate limiting policies

---

### 21. Deployment Documentation
**Status:** ⚠️ INCOMPLETE

**Needed:**
- Deployment procedures
- Rollback procedures
- Environment setup guide
- Troubleshooting guide

---

## Priority Action Items

### Immediate (Before Production Launch)
1. ✅ Fix CORS configuration
2. ✅ Update redirect URIs for production
3. ✅ Implement role-based access control in backend
4. ✅ Remove or implement incomplete features (Edit/Audit buttons)
5. ✅ Create production environment files

### High Priority (First Week)
1. ⚠️ Set up error tracking (Sentry)
2. ⚠️ Implement health checks
3. ⚠️ Clean up console.log statements
4. ⚠️ Add production monitoring

### Medium Priority (First Month)
1. ℹ️ Load testing
2. ℹ️ Complete API documentation
3. ℹ️ Fix skipped E2E tests
4. ℹ️ Optimize bundle size

---

## Quick Fixes Script

Create this file as `scripts/production-prep.sh`:

```bash
#!/bin/bash

echo "🔍 Production Readiness Check"
echo "=============================="

# Check for console.log
echo "\n📝 Checking for console.log statements..."
grep -r "console.log" src/ --exclude-dir=node_modules | wc -l

# Check for TODO comments
echo "\n📋 Checking for TODO comments..."
grep -r "TODO:" src/ --exclude-dir=node_modules | wc -l

# Check for localhost references
echo "\n🌐 Checking for localhost references..."
grep -r "localhost" src/ --exclude-dir=node_modules | wc -l

# Check environment files
echo "\n⚙️  Checking environment files..."
if [ -f ".env.production" ]; then
    echo "✅ .env.production exists"
else
    echo "❌ .env.production missing"
fi

echo "\n✅ Check complete!"
```

---

## Sign-Off Checklist

Before deploying to production, ensure:

- [ ] All critical issues resolved
- [ ] Environment variables configured
- [ ] CORS properly set
- [ ] Role-based access working
- [ ] Error tracking enabled
- [ ] Health checks implemented
- [ ] Production build tested
- [ ] SSL certificate installed
- [ ] Monitoring configured
- [ ] Backup strategy in place
- [ ] Rollback plan documented
- [ ] Team trained on deployment process
