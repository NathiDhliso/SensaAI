/**
 * Link Validation Service
 * 
 * Part of Layer 2 (The Truth) in the Hybrid Grounding System.
 * Validates that generated documentation URLs are:
 * 1. From official documentation domains
 * 2. Actually reachable (not broken links)
 * 
 * Features:
 * - Domain whitelist validation
 * - HTTP HEAD requests with redirect following
 * - Caching to avoid rate limits
 * - Batch validation for bulk operations
 */

import { 
  LinkValidationResult, 
  ValidationCache,
  VALID_DOCUMENTATION_DOMAINS 
} from '../types/grounding';

// In-memory cache (in production, use Redis or DynamoDB)
const validationCache = new Map<string, ValidationCache>();

// Configuration
const CONFIG = {
  CACHE_TTL_SECONDS: 86400, // 24 hours
  REQUEST_TIMEOUT_MS: 5000,
  MAX_REDIRECTS: 3,
  BATCH_SIZE: 10,
  BATCH_DELAY_MS: 100,
  RETRY_COUNT: 3,
  RETRY_DELAYS_MS: [1000, 2000, 4000],
};

/**
 * Hash a URL for cache key (simple implementation)
 */
function hashUrl(url: string): string {
  let hash = 0;
  for (let i = 0; i < url.length; i++) {
    const char = url.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return `link:${Math.abs(hash).toString(36)}`;
}

/**
 * Check if a cached result is still valid
 */
function isCacheValid(cache: ValidationCache): boolean {
  const age = (Date.now() - new Date(cache.checkedAt).getTime()) / 1000;
  return age < cache.ttlSeconds;
}

/**
 * Check if a URL is from a valid official documentation domain
 */
export function isOfficialDomain(url: string): { valid: boolean; domain?: string; reason?: string } {
  try {
    const parsedUrl = new URL(url);
    const hostname = parsedUrl.hostname.toLowerCase();
    
    const matchedDomain = VALID_DOCUMENTATION_DOMAINS.find(domain => 
      hostname === domain || hostname.endsWith(`.${domain}`)
    );
    
    if (matchedDomain) {
      return { valid: true, domain: matchedDomain };
    }
    
    return { 
      valid: false, 
      reason: `Domain "${hostname}" is not in the approved documentation domain list`
    };
  } catch {
    return { valid: false, reason: 'Invalid URL format' };
  }
}

/**
 * Validate a single URL (with caching)
 */
export async function validateOfficialSource(url: string): Promise<LinkValidationResult> {
  const cacheKey = hashUrl(url);
  
  // Check cache first
  const cached = validationCache.get(cacheKey);
  if (cached && isCacheValid(cached)) {
    return {
      url,
      valid: cached.valid,
      checkedAt: cached.checkedAt,
      statusCode: cached.statusCode,
      reason: cached.valid ? undefined : 'Cached invalid result',
    };
  }
  
  // Step 1: Domain validation
  const domainCheck = isOfficialDomain(url);
  if (!domainCheck.valid) {
    const result: LinkValidationResult = {
      url,
      valid: false,
      reason: domainCheck.reason,
      checkedAt: new Date().toISOString(),
    };
    
    // Cache the failure
    validationCache.set(cacheKey, {
      url,
      valid: false,
      checkedAt: result.checkedAt,
      ttlSeconds: CONFIG.CACHE_TTL_SECONDS,
    });
    
    return result;
  }
  
  // Step 2: HTTP validation with retries
  let lastError: string | undefined;
  let statusCode: number | undefined;
  
  for (let attempt = 0; attempt < CONFIG.RETRY_COUNT; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), CONFIG.REQUEST_TIMEOUT_MS);
      
      const response = await fetch(url, {
        method: 'HEAD',
        redirect: 'follow',
        signal: controller.signal,
        headers: {
          'User-Agent': 'SensaPBL-LinkValidator/1.0',
        },
      });
      
      clearTimeout(timeoutId);
      statusCode = response.status;
      
      if (response.ok) {
        const result: LinkValidationResult = {
          url,
          valid: true,
          checkedAt: new Date().toISOString(),
          statusCode,
          redirectedTo: response.url !== url ? response.url : undefined,
        };
        
        // Cache success
        validationCache.set(cacheKey, {
          url,
          valid: true,
          checkedAt: result.checkedAt,
          ttlSeconds: CONFIG.CACHE_TTL_SECONDS,
          statusCode,
        });
        
        return result;
      }
      
      // Handle specific status codes
      if (response.status === 429) {
        // Rate limited - wait longer before retry
        await sleep(CONFIG.RETRY_DELAYS_MS[attempt] * 2);
        lastError = 'Rate limited by documentation server';
        continue;
      }
      
      if (response.status === 404) {
        lastError = 'Page not found (404)';
        break; // Don't retry 404s
      }
      
      lastError = `HTTP ${response.status}`;
      
    } catch (error) {
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          lastError = 'Request timeout';
        } else {
          lastError = error.message;
        }
      } else {
        lastError = 'Unknown error';
      }
    }
    
    // Wait before retry
    if (attempt < CONFIG.RETRY_COUNT - 1) {
      await sleep(CONFIG.RETRY_DELAYS_MS[attempt]);
    }
  }
  
  // All retries failed
  const result: LinkValidationResult = {
    url,
    valid: false,
    reason: lastError || 'Validation failed',
    checkedAt: new Date().toISOString(),
    statusCode,
  };
  
  // Cache failure
  validationCache.set(cacheKey, {
    url,
    valid: false,
    checkedAt: result.checkedAt,
    ttlSeconds: CONFIG.CACHE_TTL_SECONDS / 4, // Shorter TTL for failures
    statusCode,
  });
  
  return result;
}

/**
 * Validate multiple URLs in batches to avoid rate limiting
 */
export async function validateBatch(urls: string[]): Promise<Map<string, LinkValidationResult>> {
  const results = new Map<string, LinkValidationResult>();
  const uniqueUrls = [...new Set(urls)];
  
  // Process in batches
  for (let i = 0; i < uniqueUrls.length; i += CONFIG.BATCH_SIZE) {
    const batch = uniqueUrls.slice(i, i + CONFIG.BATCH_SIZE);
    
    // Validate batch in parallel
    const batchResults = await Promise.all(
      batch.map(url => validateOfficialSource(url))
    );
    
    // Store results
    batchResults.forEach((result, index) => {
      results.set(batch[index], result);
    });
    
    // Delay between batches to avoid rate limiting
    if (i + CONFIG.BATCH_SIZE < uniqueUrls.length) {
      await sleep(CONFIG.BATCH_DELAY_MS);
    }
  }
  
  return results;
}

/**
 * Quick domain-only validation (no HTTP request)
 * Use when you just want to check if a URL is from an approved domain
 */
export function quickValidateDomain(url: string): boolean {
  return isOfficialDomain(url).valid;
}

/**
 * Get validation statistics
 */
export function getValidationStats(): {
  cacheSize: number;
  validCount: number;
  invalidCount: number;
} {
  let validCount = 0;
  let invalidCount = 0;
  
  validationCache.forEach(cache => {
    if (isCacheValid(cache)) {
      if (cache.valid) validCount++;
      else invalidCount++;
    }
  });
  
  return {
    cacheSize: validationCache.size,
    validCount,
    invalidCount,
  };
}

/**
 * Clear the validation cache
 */
export function clearValidationCache(): void {
  validationCache.clear();
}

/**
 * Invalidate a specific URL in the cache
 */
export function invalidateCachedUrl(url: string): boolean {
  const cacheKey = hashUrl(url);
  return validationCache.delete(cacheKey);
}

// Helper function
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export default {
  validateOfficialSource,
  validateBatch,
  quickValidateDomain,
  isOfficialDomain,
  getValidationStats,
  clearValidationCache,
  invalidateCachedUrl,
};
