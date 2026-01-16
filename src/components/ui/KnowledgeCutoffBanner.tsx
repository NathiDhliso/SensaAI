import { ExternalLink, RefreshCw, Lightbulb } from 'lucide-react';

interface KnowledgeCutoffBannerProps {
  subject: string;
  generatedAt?: string;
  blueprintVersion?: string;
  isStale?: boolean;
  onRegenerate?: () => void;
}

/**
 * KnowledgeCutoffBanner - Provides helpful study guidance
 * 
 * Silver Bullet Principle: Don't show scary warnings about "unverified" content.
 * Instead, help the user understand how to use this content effectively.
 * 
 * The message should be: "Here's your study material. Here's how to get the most from it."
 */
export function KnowledgeCutoffBanner({ 
  subject,
  generatedAt, 
  blueprintVersion,
  isStale = false,
  onRegenerate 
}: KnowledgeCutoffBannerProps) {
  // Safe date formatting - handle missing or invalid dates
  const formattedDate = generatedAt 
    ? (() => {
        const date = new Date(generatedAt);
        return isNaN(date.getTime()) 
          ? null 
          : date.toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
      })()
    : null;

  // Generate accurate official documentation URL based on certification code
  const getOfficialDocsUrl = (topic: string): string => {
    const normalized = topic.toUpperCase().replace(/[\s-]/g, '');
    
    // Microsoft Azure certifications (AZ-###)
    if (/^AZ\d{3}/.test(normalized)) {
      const certCode = topic.match(/AZ-?\d{3}/i)?.[0].toUpperCase() || topic;
      return `https://learn.microsoft.com/en-us/credentials/certifications/exams/${certCode.toLowerCase()}`;
    }
    
    // Microsoft Power Platform (PL-###)
    if (/^PL\d{3}/.test(normalized)) {
      const certCode = topic.match(/PL-?\d{3}/i)?.[0].toUpperCase() || topic;
      return `https://learn.microsoft.com/en-us/credentials/certifications/exams/${certCode.toLowerCase()}`;
    }
    
    // Microsoft Dynamics (MB-###)
    if (/^MB\d{3}/.test(normalized)) {
      const certCode = topic.match(/MB-?\d{3}/i)?.[0].toUpperCase() || topic;
      return `https://learn.microsoft.com/en-us/credentials/certifications/exams/${certCode.toLowerCase()}`;
    }
    
    // AWS certifications
    if (topic.toLowerCase().includes('aws')) {
      return `https://aws.amazon.com/certification/`;
    }
    
    // Google Cloud
    if (topic.toLowerCase().includes('gcp') || topic.toLowerCase().includes('google cloud')) {
      return `https://cloud.google.com/learn/certification`;
    }
    
    // Fallback to general search
    return `https://www.google.com/search?q=${encodeURIComponent(topic)}+official+exam+guide`;
  };

  if (isStale) {
    return (
      <div
        role="alert"
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: '0.75rem',
          padding: '0.875rem 1rem',
          backgroundColor: 'var(--color-warning-bg)',
          border: '1px solid var(--color-warning-border)',
          borderRadius: '8px',
          marginBottom: '1rem',
        }}
      >
        <RefreshCw 
          size={18} 
          color="var(--color-warning)"
          style={{ flexShrink: 0, marginTop: '2px' }}
        />
        <div style={{ flex: 1 }}>
          <p style={{ 
            margin: 0, 
            fontSize: '0.875rem', 
            color: 'var(--color-warning)',
            fontWeight: 500
          }}>
            Consider Refreshing
          </p>
          <p style={{ 
            margin: '0.25rem 0 0 0', 
            fontSize: '0.8rem', 
            color: 'var(--color-text-secondary)',
            lineHeight: 1.5
          }}>
            This content was created a while ago. Exam topics may have been updated since then.
          </p>
          {onRegenerate && (
            <button
              onClick={onRegenerate}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.375rem',
                marginTop: '0.5rem',
                padding: '0.375rem 0.75rem',
                fontSize: '0.75rem',
                fontWeight: 500,
                color: 'var(--color-warning)',
                background: 'var(--color-warning-bg)',
                border: '1px solid var(--color-warning-border)',
                borderRadius: '4px',
                cursor: 'pointer',
              }}
            >
              <RefreshCw size={12} />
              Regenerate Content
            </button>
          )}
        </div>
      </div>
    );
  }

  // Default: Helpful guidance banner (not a warning!)
  return (
    <div
      role="status"
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: '0.75rem',
        padding: '0.75rem 1rem',
        backgroundColor: 'var(--overlay-primary-5)',
        border: '1px solid var(--color-border)',
        borderRadius: '8px',
        marginBottom: '1rem',
      }}
    >
      <Lightbulb 
        size={18} 
        color="var(--color-accent)"
        style={{ flexShrink: 0, marginTop: '1px' }}
      />
      <div style={{ flex: 1 }}>
        <p style={{ 
          margin: 0, 
          fontSize: '0.8rem', 
          color: 'var(--color-text-secondary)',
          lineHeight: 1.5
        }}>
          <strong style={{ color: 'var(--color-text-primary)' }}>Study Tip:</strong>{' '}
          This AI-generated content covers key concepts
          {formattedDate && <> (created {formattedDate})</>}
          {blueprintVersion && (
            <span style={{ 
              marginLeft: '0.5rem',
              padding: '2px 6px',
              background: 'var(--color-success-bg)',
              borderRadius: '4px',
              fontSize: '0.7rem',
              color: 'var(--color-success)'
            }}>
              📋 {blueprintVersion}
            </span>
          )}
          . For the latest details, cross-reference with{' '}
          <a 
            href={getOfficialDocsUrl(subject)} 
            target="_blank" 
            rel="noopener noreferrer"
            style={{ 
              color: 'var(--color-accent)',
              textDecoration: 'none',
              fontWeight: 500,
            }}
          >
            official docs
            <ExternalLink size={10} style={{ marginLeft: '3px', verticalAlign: 'middle' }} />
          </a>
        </p>
      </div>
    </div>
  );
}

export default KnowledgeCutoffBanner;
