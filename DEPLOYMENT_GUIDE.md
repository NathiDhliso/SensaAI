# Multi-Phase System Deployment Guide

## Quick Start

### 1. Build Backend
```bash
cd backend
npm run build
```

### 2. Test Locally
```bash
# Run unit tests
npm test -- content-validators.test.ts

# Run integration tests (requires AWS credentials)
npm test -- integration.test.ts
```

### 3. Deploy to Lambda
```bash
# Package and deploy
npm run deploy

# Or use your existing deployment script
```

### 4. Test in Production
```bash
# Test with multi-phase (new system)
curl -X POST https://your-api.com/api/generation/start \
  -H "Content-Type: application/json" \
  -d '{"subject": "AWS Lambda Basics", "useMultiPhase": true}'

# Test with legacy (fallback)
curl -X POST https://your-api.com/api/generation/start \
  -H "Content-Type: application/json" \
  -d '{"subject": "AWS Lambda Basics", "useMultiPhase": false}'
```

## Environment Variables

Ensure these are set in your Lambda environment:

```bash
AWS_REGION=us-east-1  # Or your preferred region
```

## Rollback Plan

If the new system has issues:

### Option 1: Disable Multi-Phase (Quick)
Update frontend to send `useMultiPhase: false`:

```typescript
// src/features/content-generation/api.ts
const response = await fetch('/api/generation/start', {
  method: 'POST',
  body: JSON.stringify({
    subject,
    useMultiPhase: false  // Use legacy system
  })
});
```

### Option 2: Revert Backend (Full Rollback)
```bash
git revert <commit-hash>
cd backend && npm run build && npm run deploy
```

## Monitoring

### Key Metrics to Watch

1. **Generation Success Rate**
   - Target: >95%
   - Alert if: <90%

2. **Validation Score**
   - Target: >85/100
   - Alert if: <70/100

3. **Generation Time**
   - Target: 90-120 seconds
   - Alert if: >180 seconds

4. **Error Rate by Phase**
   - Phase 1 failures: Should be <1%
   - Phase 2 failures: Should be <5% (partial recovery handles this)
   - Phase 3 failures: Should be <1%

### CloudWatch Logs to Monitor

```bash
# Phase 1 errors
aws logs filter-log-events \
  --log-group-name /aws/lambda/your-function \
  --filter-pattern "Phase 1 validation failed"

# Phase 2 partial failures
aws logs filter-log-events \
  --log-group-name /aws/lambda/your-function \
  --filter-pattern "Partial failure in Phase 2"

# Validation issues
aws logs filter-log-events \
  --log-group-name /aws/lambda/your-function \
  --filter-pattern "Validation Score"
```

## Cost Monitoring

### Expected Costs (per generation)

**Multi-Phase System:**
- Phase 1 (Sonnet): ~$0.15-0.20
- Phase 2 (Sonnet, batched): ~$0.20-0.30
- Phase 3 (Haiku): ~$0.02-0.05
- **Total: ~$0.40-0.60 per generation**

**Legacy System:**
- Single call (Sonnet): ~$0.50-0.80
- **Total: ~$0.50-0.80 per generation**

**Savings: 20-30% cost reduction**

### Monitor Bedrock Costs

```bash
# Check Bedrock usage
aws ce get-cost-and-usage \
  --time-period Start=2026-01-01,End=2026-01-31 \
  --granularity MONTHLY \
  --metrics BlendedCost \
  --filter file://bedrock-filter.json
```

## Troubleshooting

### Issue: Phase 1 returns invalid JSON

**Symptoms:** Error "Phase 1 did not return valid JSON"

**Fix:** Check prompt formatting, ensure JSON block is properly closed

**Workaround:** Use legacy system temporarily

### Issue: Phase 2 generates circular definitions

**Symptoms:** Validation score <70, many "circular_definition" issues

**Fix:** Tune Phase 2 prompt to be more explicit about anti-circular rules

**Workaround:** Regenerate with different subject phrasing

### Issue: Phase 3 validation too strict

**Symptoms:** Validation score consistently <60, many warnings

**Fix:** Adjust scoring rubric in Phase 3 prompt

**Workaround:** Accept lower scores temporarily (>50 is still usable)

### Issue: Timeout errors

**Symptoms:** Lambda timeout after 60 seconds

**Fix:** Increase Lambda timeout to 180 seconds (3 minutes)

```bash
aws lambda update-function-configuration \
  --function-name your-function \
  --timeout 180
```

## Testing Checklist

Before deploying to production:

- [ ] Unit tests pass (34 tests)
- [ ] TypeScript compiles without errors
- [ ] Integration test passes with real AWS credentials
- [ ] Manual test: Generate content for "AWS Lambda"
- [ ] Manual test: Generate content for "Azure Functions"
- [ ] Manual test: Verify no circular definitions in output
- [ ] Manual test: Verify no compound word anchors in output
- [ ] Manual test: Check validation score is >80
- [ ] Manual test: Test legacy system still works (useMultiPhase: false)
- [ ] Load test: 10 concurrent generations complete successfully
- [ ] Cost test: Verify per-generation cost is <$0.70

## Gradual Rollout Strategy

### Phase 1: Canary (10% traffic)
```typescript
// In frontend
const useMultiPhase = Math.random() < 0.1; // 10% of users
```

Monitor for 24 hours:
- Success rate
- Validation scores
- User feedback

### Phase 2: Expanded (50% traffic)
```typescript
const useMultiPhase = Math.random() < 0.5; // 50% of users
```

Monitor for 48 hours:
- Compare quality metrics vs legacy
- Check cost savings

### Phase 3: Full Rollout (100% traffic)
```typescript
const useMultiPhase = true; // All users
```

Keep legacy system available for 2 weeks as fallback.

## Success Criteria

The multi-phase system is considered successful if:

1. ✅ Circular definitions reduced by >90%
2. ✅ Compound word anchors reduced by >95%
3. ✅ Validation score averages >80/100
4. ✅ Generation success rate >95%
5. ✅ Cost per generation <$0.70
6. ✅ User satisfaction maintained or improved

## Support

If issues arise:

1. Check CloudWatch logs for error details
2. Review validation scores and issues
3. Test with legacy system to isolate problem
4. Adjust prompts based on specific failure patterns
5. Contact: [Your team contact info]

---

**Last Updated:** January 29, 2026  
**Version:** 1.0.0  
**Status:** Ready for deployment
