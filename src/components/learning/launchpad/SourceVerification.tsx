import React from 'react';
import { motion } from 'framer-motion';
import { ExternalLink, Book, Globe, Users, ShieldCheck } from 'lucide-react';
import styles from './SourceVerification.module.css';

interface SourceVerificationProps {
    subject: string;
    delay?: number;
}

export const SourceVerification: React.FC<SourceVerificationProps> = ({ subject, delay = 0 }) => {

    // Heuristic: Build smart search URLs based on the subject
    const getLinks = (term: string) => [
        {
            id: 'docs',
            label: 'Official Docs',
            icon: Book,
            url: `https://www.google.com/search?q=${encodeURIComponent(term)}+official+documentation`,
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
                    <ShieldCheck size={18} className={styles.icon} />
                    <h3>Verify Content</h3>
                </div>
                <span className={styles.badge}>Live Web Check</span>
            </div>

            <p className={styles.description}>
                Solidify your confidence. Cross-reference this AI-generated plan with authorized real-world sources.
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
