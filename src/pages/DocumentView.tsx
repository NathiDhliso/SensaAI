import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Lightbulb, Map, FileText, Download } from 'lucide-react';
import { storageManager } from '@/features/content-storage';
import { parseContent } from '@/features/content-generation/parsers/json-parser';
import type { ParsedConcept } from '@/features/content-generation/parsers/types';
import styles from './DocumentView.module.css';

export default function DocumentView() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [viewMode, setViewMode] = useState<'formatted' | 'raw'>('formatted');
    const [content, setContent] = useState<{
        subject: string;
        domain: string;
        date: string;
        data: { concepts: ParsedConcept[]; learningPath?: { stages: { name: string; narrativeBridge?: string; capabilitiesGained?: string }[] } } | null; // Structured data
        raw: string; // Always keep raw text available
    } | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function loadDocument() {
            if (!id) return;
            try {
                const result = await storageManager.loadResult(id);
                if (!result || !result.fullDocument) {
                    setError('Document not found');
                    return;
                }

                const parseResult = parseContent(result.fullDocument);

                setContent({
                    subject: result.subject,
                    domain: result.pass1Data.domain,
                    date: new Date(result.generatedAt).toLocaleDateString(),
                    data: parseResult.success ? parseResult.data : null,
                    raw: result.fullDocument
                });

                // If parsing failed, force raw view
                if (!parseResult.success) {
                    setViewMode('raw');
                }

            } catch (err) {
                console.error(err);
                setError('Failed to load document');
            } finally {
                setLoading(false);
            }
        }

        loadDocument();
    }, [id]);

    if (loading) return <div className={styles.loading}>Loading document...</div>;
    if (error) return <div className={styles.loading}>Error: {error}</div>;
    if (!content) return null;

    return (
        <div className={styles.container}>
            <div className={styles.wrapper}>
                <div className={styles.header}>
                    <button onClick={() => navigate('/library')} className={styles.backButton}>
                        <ArrowLeft size={18} />
                        Back to Library
                    </button>

                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button
                            className={styles.backButton}
                            onClick={() => setViewMode(prev => prev === 'formatted' ? 'raw' : 'formatted')}
                            title="Toggle View Mode"
                        >
                            {viewMode === 'formatted' ? <FileText size={18} /> : <Lightbulb size={18} />}
                            {viewMode === 'formatted' ? 'View Raw Text' : 'View Formatted'}
                        </button>
                        <button className={styles.backButton} onClick={() => window.print()}>
                            <Download size={18} />
                            Print / PDF
                        </button>
                    </div>
                </div>

                <div className={styles.document}>
                    <div className={styles.metaHeader}>
                        <h1 className={styles.title}>{content.subject}</h1>
                        <div className={styles.domain}>
                            <span className={styles.tag}>{content.domain}</span>
                            <span>•</span>
                            <span>Generated {content.date}</span>
                        </div>
                    </div>

                    {viewMode === 'formatted' && content.data ? (
                        <>
                            <div className={styles.section}>
                                <h2 className={styles.sectionTitle}>
                                    <Lightbulb size={24} />
                                    Concepts & Mnemonics
                                </h2>
                                <div className={styles.conceptList}>
                                    {content.data.concepts?.map((concept: ParsedConcept, idx: number) => (
                                        <div key={idx} className={styles.conceptItem}>
                                            <div className={styles.conceptHeader}>
                                                <span className={styles.conceptName}>{idx + 1}. {concept.name}</span>
                                                <span className={styles.conceptTier}>
                                                    {concept.tier || concept.mnemonic?.tier || 'General'}
                                                </span>
                                            </div>
                                            <p className={styles.conceptDef}>
                                                {concept.phase1?.microMetaphor || concept.phase1?.hookSentence || "No definition available"}
                                            </p>

                                            {concept.mnemonic && (
                                                <div className={styles.mnemonicBox}>
                                                    <span className={styles.mnemonicLabel}>Mental Anchor: {concept.mnemonic.anchor}</span>
                                                    <p className={styles.mnemonicText}>{concept.mnemonic.story}</p>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className={styles.section}>
                                <h2 className={styles.sectionTitle}>
                                    <Map size={24} />
                                    Learning Path
                                </h2>
                                <div className={styles.learningPath}>
                                    {content.data.learningPath?.stages?.map((stage: { name: string; narrativeBridge?: string; capabilitiesGained?: string }, idx: number) => (
                                        <div key={idx} className={styles.pathStep}>
                                            <div className={styles.stepNumber}>{idx + 1}</div>
                                            <div className={styles.stepContent}>
                                                <h4>{stage.name}</h4>
                                                <div className={styles.stepMeta}>
                                                    {stage.narrativeBridge || stage.capabilitiesGained}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className={styles.section}>
                            <h2 className={styles.sectionTitle}>
                                <FileText size={24} />
                                Raw Content
                            </h2>
                            <pre className={styles.rawView}>
                                {content.raw}
                            </pre>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
