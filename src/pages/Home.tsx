import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Archive, Sparkles, Clock, Zap, Cloud, ChevronDown, ChevronUp, Target } from 'lucide-react';
import { SensaShape } from '@/components/ui';
import { parseSyllabusText } from '@/features/content-audit';
import type { SensaShapeType } from '@/components/ui';
import { motion, AnimatePresence } from 'framer-motion';
import { useGenerationStore } from '@/store/generation-store';
import { useUIStore } from '@/store/ui-store';
import { CloudLibraryModal } from '@/components/storage/CloudLibraryModal';
import { CATEGORY_COLORS, DIFFICULTY_COLORS } from '@/shared/constants/theme-colors';
import { UI_TIMINGS } from '@/shared/constants/ui-constants';
import styles from './Home.module.css';
const SUBJECT_CATEGORIES = [
 {
 id: 'cloud',
 name: 'Cloud & DevOps',
 shapeType: 'nebula' as SensaShapeType,
 color: CATEGORY_COLORS.cloud,
 subjects: [
 { name: 'AWS Solutions Architect', difficulty: 'Advanced', hours: 40 },
 { name: 'Azure Administrator', difficulty: 'Intermediate', hours: 35 },
 { name: 'Kubernetes', difficulty: 'Advanced', hours: 30 },
 { name: 'Docker Fundamentals', difficulty: 'Beginner', hours: 15 },
 { name: 'Terraform', difficulty: 'Intermediate', hours: 25 }
 ]
 },
 {
 id: 'data',
 name: 'Data & AI',
 shapeType: 'synapse' as SensaShapeType,
 color: CATEGORY_COLORS.data,
 subjects: [
 { name: 'Machine Learning Fundamentals', difficulty: 'Intermediate', hours: 35 },
 { name: 'Python for Data Science', difficulty: 'Beginner', hours: 20 },
 { name: 'SQL Mastery', difficulty: 'Beginner', hours: 15 },
 { name: 'Power BI', difficulty: 'Intermediate', hours: 20 },
 { name: 'Data Engineering', difficulty: 'Advanced', hours: 40 }
 ]
 },
 {
 id: 'dev',
 name: 'Development',
 shapeType: 'construct' as SensaShapeType,
 color: CATEGORY_COLORS.dev,
 subjects: [
 { name: 'React & TypeScript', difficulty: 'Intermediate', hours: 30 },
 { name: 'Node.js Backend', difficulty: 'Intermediate', hours: 25 },
 { name: 'System Design', difficulty: 'Advanced', hours: 35 },
 { name: 'REST API Design', difficulty: 'Beginner', hours: 15 },
 { name: 'GraphQL', difficulty: 'Intermediate', hours: 20 }
 ]
 },
 {
 id: 'security',
 name: 'Cybersecurity',
 shapeType: 'bastion' as SensaShapeType,
 color: CATEGORY_COLORS.security,
 subjects: [
 { name: 'CompTIA Security+', difficulty: 'Intermediate', hours: 30 },
 { name: 'Network Security', difficulty: 'Advanced', hours: 35 },
 { name: 'Ethical Hacking', difficulty: 'Advanced', hours: 40 },
 { name: 'CISSP Fundamentals', difficulty: 'Expert', hours: 60 },
 { name: 'Penetration Testing', difficulty: 'Advanced', hours: 45 }
 ]
 },
 {
 id: 'business',
 name: 'Business',
 shapeType: 'prism' as SensaShapeType,
 color: CATEGORY_COLORS.business,
 subjects: [
 { name: 'PMP Certification', difficulty: 'Advanced', hours: 40 },
 { name: 'Agile & Scrum', difficulty: 'Beginner', hours: 15 },
 { name: 'Business Analysis', difficulty: 'Intermediate', hours: 25 },
 { name: 'Product Management', difficulty: 'Intermediate', hours: 30 },
 { name: 'Financial Analysis', difficulty: 'Advanced', hours: 35 }
 ]
 }
];
const DIFFICULTY_LEVELS = {
 Beginner: { color: DIFFICULTY_COLORS.Beginner, shapeType: 'seed' as SensaShapeType, label: '~15-20 hrs' },
 Intermediate: { color: DIFFICULTY_COLORS.Intermediate, shapeType: 'sprout' as SensaShapeType, label: '~25-35 hrs' },
 Advanced: { color: DIFFICULTY_COLORS.Advanced, shapeType: 'bloom' as SensaShapeType, label: '~40-50 hrs' },
 Expert: { color: DIFFICULTY_COLORS.Expert, shapeType: 'crown' as SensaShapeType, label: '~60+ hrs' }
};
export default function Home() {
 const [subject, setSubject] = useState('');
 const [showSuggestions, setShowSuggestions] = useState(false);
 const [showCloudLibrary, setShowCloudLibrary] = useState(false);
 const [objectivesText, setObjectivesText] = useState('');
 const [objectivesOpen, setObjectivesOpen] = useState(false);
 const [showPreview, setShowPreview] = useState(false);
 const navigate = useNavigate();
 /* Hooks & Store */
 const { openSettingsPanel } = useUIStore();
 const { recentSubjects } = useGenerationStore();
 /* Derived State */
 const allSubjects = useMemo(() => {
 return SUBJECT_CATEGORIES.flatMap(cat => cat.subjects.map(sub => ({
 ...sub,
 category: cat.name
 })));
 }, []);
 const parsedObjectives = useMemo(() => {
 if (!objectivesText.trim()) return [];
 return parseSyllabusText(objectivesText);
 }, [objectivesText]);
 const filteredSuggestions = useMemo(() => {
 if (!subject.trim()) return [];
 return allSubjects.filter(s =>
 s.name.toLowerCase().includes(subject.toLowerCase())
 ).slice(0, 5);
 }, [subject, allSubjects]);
 const handleSelectSuggestion = (name: string) => {
 setSubject(name);
 setShowSuggestions(false);
 };
 const handleGenerate = () => {
 if (subject.trim()) {
 setShowSuggestions(false);
 const params = new URLSearchParams();
 if (parsedObjectives.length > 0) {
 params.set('context', parsedObjectives.join('\n'));
 }
 const query = params.toString();
 navigate(`/generate/${encodeURIComponent(subject)}${query ? `?${query}` : ''}`);
 }
 };
 return (
 <div className={styles.container}>
 <div className={styles.heroWrapper}>
 <motion.div
 className={`${styles.heroContent} ${!subject ? styles.idle : ''}`}
 transition={{ duration: 0.3 }}
 >
 {/* Reactive Sensa Shape - Wakes up on input */}
 <div className={styles.heroIcon}>
 <SensaShape
 type="nebula"
 size="xl"
 animate={true}
 />
 </div>
 <div className={styles.inputSection}>
 <div className={styles.inputWrapper}>
 <Search
 className={styles.searchIcon}
 style={{
 color: subject.length > 0 ? 'var(--color-primary)' : 'var(--color-text-muted)',
 filter: subject.length > 0 ? 'drop-shadow(0 0 8px var(--color-primary))' : 'none'
 }}
 />
 <input
 type="text"
 value={subject}
 onChange={(e) => {
 setSubject(e.target.value);
 setShowSuggestions(true);
 }}
 onFocus={() => setShowSuggestions(true)}
 onBlur={() => setTimeout(() => setShowSuggestions(false), UI_TIMINGS.BLUR_DELAY)}
 onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
 placeholder="Enter any subject to learn..."
 className={styles.input}
 autoFocus
 />
 <AnimatePresence>
 {showSuggestions && filteredSuggestions.length > 0 && (
 <motion.div
 className={styles.suggestionsDropdown}
 initial={{ opacity: 0, y: -10 }}
 animate={{ opacity: 1, y: 0 }}
 exit={{ opacity: 0, y: -10 }}
 >
 {filteredSuggestions.map((s, idx) => (
 <button
 key={idx}
 className={styles.suggestionItem}
 onMouseDown={() => handleSelectSuggestion(s.name)}
 >
 <div className={styles.suggestionMain}>
 <Sparkles size={14} />
 <span>{s.name}</span>
 </div>
 <div className={styles.suggestionMeta}>
 <span
 className={styles.difficultyBadge}
 style={{
 background: DIFFICULTY_LEVELS[s.difficulty as keyof typeof DIFFICULTY_LEVELS]?.color + '20',
 color: DIFFICULTY_LEVELS[s.difficulty as keyof typeof DIFFICULTY_LEVELS]?.color
 }}
 >
 <SensaShape
 type={DIFFICULTY_LEVELS[s.difficulty as keyof typeof DIFFICULTY_LEVELS]?.shapeType}
 size="sm"
 animate={false}
 />
 {s.difficulty}
 </span>
 <span className={styles.hoursBadge}>
 <Clock size={12} /> {s.hours}h
 </span>
 </div>
 </button>
 ))}
 </motion.div>
 )}
 </AnimatePresence>
 </div>
 </div>
 <div className={styles.objectivesSection}>
 <button
 className={styles.objectivesToggle}
 onClick={() => setObjectivesOpen(!objectivesOpen)}
 >
 <Target size={14} />
 <span>{parsedObjectives.length > 0 ? `${parsedObjectives.length} Exam Objectives Loaded` : 'Paste Exam Objectives (Recommended)'}</span>
 {objectivesOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
 </button>
 <AnimatePresence>
 {objectivesOpen && (
 <motion.div
 initial={{ height: 0, opacity: 0 }}
 animate={{ height: 'auto', opacity: 1 }}
 exit={{ height: 0, opacity: 0 }}
 transition={{ duration: 0.2 }}
 className={styles.objectivesBody}
 >
 <textarea
 className={styles.objectivesInput}
 value={objectivesText}
 onChange={e => { setObjectivesText(e.target.value); setShowPreview(false); }}
 onPaste={() => setTimeout(() => setShowPreview(true), 50)}
 placeholder={'Paste your exam objectives or syllabus here.\nHeaders, numbering, percentages, and junk lines are auto-cleaned.\n\nExample:\nManage Azure identities and governance (20-25%)\n Create users and groups\n Manage licenses in Microsoft Entra ID\n Configure self-service password reset'}
 rows={6}
 spellCheck={false}
 />
 {parsedObjectives.length > 0 && (
 <div className={styles.objectivesMeta}>
 <span className={styles.objectivesCount}>{parsedObjectives.length} objectives detected</span>
 <button
 type="button"
 className={styles.objectivesPreviewToggle}
 onClick={() => setShowPreview(!showPreview)}
 >
 {showPreview ? 'Hide preview' : 'Show cleaned preview'}
 </button>
 </div>
 )}
 <AnimatePresence>
 {showPreview && parsedObjectives.length > 0 && (
 <motion.ul
 className={styles.objectivesPreviewList}
 initial={{ height: 0, opacity: 0 }}
 animate={{ height: 'auto', opacity: 1 }}
 exit={{ height: 0, opacity: 0 }}
 transition={{ duration: 0.2 }}
 >
 {parsedObjectives.map((obj, i) => (
 <li key={i} className={styles.objectivesPreviewItem}>{obj}</li>
 ))}
 </motion.ul>
 )}
 </AnimatePresence>
 </motion.div>
 )}
 </AnimatePresence>
 </div>
 <div className={styles.groundingStatus}>
 {parsedObjectives.length > 0 ? (
 <div className={styles.groundedStatus}>
 <Target size={14} />
 <span>Objective-Driven — AI will generate concepts mapped to your {parsedObjectives.length} objectives</span>
 </div>
 ) : (
 <div className={styles.ungroundedStatus}>
 <span>Standard Mode — Paste exam objectives above for targeted content</span>
 </div>
 )}
 </div>
 <button
 onClick={handleGenerate}
 disabled={!subject.trim()}
 className={styles.generateButton}
 >
 <Zap size={18} />
 Generate Learning System
 </button>
 {recentSubjects && recentSubjects.length > 0 && (
 <div className={styles.recentSection}>
 <div className={styles.recentTags}>
 <span className={styles.recentLabel}>Recent:</span>
 {recentSubjects.map((item: string) => (
 <button
 key={item}
 onClick={() => setSubject(item)}
 className={styles.recentTag}
 >
 {item}
 </button>
 ))}
 </div>
 </div>
 )}
 </motion.div>
 <div className={styles.actionButtons}>
 <button onClick={() => setShowCloudLibrary(true)} className={styles.cloudLibraryButton}>
 <Cloud size={18} />
 Cloud Library
 </button>
 <button onClick={() => navigate('/library')} className={styles.savedButton}>
 <Archive size={18} />
 Saved Results
 </button>
 <button onClick={openSettingsPanel} className={styles.settingsButton}>
 Settings
 </button>
 </div>
 {/* Cloud Library Modal */}
 <CloudLibraryModal
 isOpen={showCloudLibrary}
 onClose={() => setShowCloudLibrary(false)}
 onUpdate={() => { }}
 />
 </div>
 </div >
 );
}