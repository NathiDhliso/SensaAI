import React from 'react';
import { motion } from 'framer-motion';
import { ExternalLink, Book, Globe, Users, Lightbulb } from 'lucide-react';
import styles from './SourceVerification.module.css';

interface SourceVerificationProps {
    subject: string;
    generatedAt?: string;
    isStale?: boolean;
    delay?: number;
}

export const SourceVerification: React.FC<SourceVerificationProps> = ({ 
    subject, 
    generatedAt,
    isStale = false,
    delay = 0 
}) => {

    // Safe date formatting
    const formattedDate = generatedAt 
        ? (() => {
            const date = new Date(generatedAt);
            return isNaN(date.getTime()) 
                ? null 
                : date.toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
          })()
        : null;

    // Generate accurate official documentation URL
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

    // Heuristic: Build smart search URLs based on the subject
    const getLinks = (term: string) => [
        {
            id: 'docs',
            label: 'Official Docs',
            icon: Book,
            url: getOfficialDocsUrl(term),
            color: 'var(--color-accent)',
            desc: 'The ground truth'
        },
        {
            id: 'wiki',
            label: 'Reference',
            icon: Globe,
            url: `https://en.wikipedia.org/wiki/Special:Search?search=${encodeURIComponent(term)}`,
            color: 'var(--color-text-secondary)',
            desc: 'High-level context'
        },
        {
            id: 'community',
            label: 'Community Hub',
            icon: Users,
            // Intelligently targets "exam topics" and "reddit" to surface "braindump" style discussions
            // without explicitly naming them "braindumps"
            url: `https://www.google.com/search?q=${encodeURIComponent(term)}+exam+topics+discussion+reddit`,
            color: 'var(--color-warning)', // Warning/Attention color
            desc: 'Real-world discussions'
        }
    ];

    const links = getLinks(subject);

    return (
        <motion.div
            className={styles.container}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay, duration: 0.4 }}
        >
            <div className={styles.header}>
                <div className={styles.titleGroup}>
                    <Lightbulb size={16} className={styles.icon} />
                    <h3>Study Tip</h3>
                </div>
                {formattedDate && (
                    <span className={styles.badge}>{formattedDate}</span>
                )}
            </div>

            <p className={styles.description}>
                This AI-generated content covers key concepts{formattedDate ? ` (created ${formattedDate})` : ''}. 
                For the latest details, cross-reference with official docs and real-world discussions.
            </p>

            <div className={styles.linkGrid}>
                {links.map((link) => (
                    <a
                        key={link.id}
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={styles.linkCard}
                        style={{ '--hover-color': link.color } as React.CSSProperties}
                    >
                        <div className={styles.linkHeader}>
                            <link.icon size={16} style={{ color: link.color }} />
                            <ExternalLink size={12} className={styles.arrow} />
                        </div>
                        <span className={styles.linkLabel}>{link.label}</span>
                        <span className={styles.linkDesc}>{link.desc}</span>
                    </a>
                ))}
            </div>
        </motion.div>
    );
};
