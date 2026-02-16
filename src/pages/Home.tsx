import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Archive, Sparkles, Clock, Zap, Cloud, ChevronDown, ChevronUp, Target, Plus, X, GitBranch, Award, Wand2, Loader2 } from 'lucide-react';
import { SensaShape, SensaAnimLogo } from '@/components/ui';
import { parseSyllabusText } from '@/features/content-audit';
import type { SensaShapeType } from '@/components/ui';
import { motion, AnimatePresence } from 'framer-motion';
import { useGenerationStore } from '@/store/generation-store';
import { useUIStore } from '@/store/ui-store';
import { useAuthStore } from '@/store/auth-store';
import { CloudLibraryModal } from '@/components/storage/CloudLibraryModal';
import { CATEGORY_COLORS, DIFFICULTY_COLORS } from '@/shared/constants/theme-colors';
import { conceptsApi } from '@/shared/api/concepts';
import { ALL_CERTS, getDomainsAsTrunks, getTasksAsObjectives } from '@/shared/constants/exam-catalogs';
import type { CertEntry } from '@/shared/constants/exam-catalogs';
import { UI_TIMINGS } from '@/shared/constants/ui-constants';
import { isGenerationAllowed } from '@/shared/constants/generator-allowlist';
import { toast } from '@/shared/utils/toast';
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
 },
 {
 id: 'sciences',
 name: 'Sciences',
 shapeType: 'synapse' as SensaShapeType,
 color: CATEGORY_COLORS.sciences,
 subjects: [
 { name: 'Biology', difficulty: 'Intermediate', hours: 30 },
 { name: 'Chemistry', difficulty: 'Intermediate', hours: 30 },
 { name: 'Physics', difficulty: 'Advanced', hours: 35 },
 { name: 'Life Sciences', difficulty: 'Beginner', hours: 20 },
 { name: 'Earth Sciences', difficulty: 'Beginner', hours: 20 }
 ]
 },
 {
 id: 'humanities',
 name: 'Humanities',
 shapeType: 'prism' as SensaShapeType,
 color: CATEGORY_COLORS.humanities,
 subjects: [
 { name: 'History', difficulty: 'Intermediate', hours: 25 },
 { name: 'Geography', difficulty: 'Beginner', hours: 20 },
 { name: 'English Literature', difficulty: 'Intermediate', hours: 25 },
 { name: 'Economics', difficulty: 'Advanced', hours: 30 },
 { name: 'Accounting', difficulty: 'Intermediate', hours: 30 }
 ]
 },
 {
 id: 'mathematics',
 name: 'Mathematics',
 shapeType: 'construct' as SensaShapeType,
 color: CATEGORY_COLORS.mathematics,
 subjects: [
 { name: 'Algebra', difficulty: 'Beginner', hours: 20 },
 { name: 'Calculus', difficulty: 'Advanced', hours: 35 },
 { name: 'Statistics', difficulty: 'Intermediate', hours: 25 },
 { name: 'Geometry', difficulty: 'Beginner', hours: 20 },
 { name: 'Linear Algebra', difficulty: 'Advanced', hours: 30 }
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
 const [trunks, setTrunks] = useState<string[]>(['', '']);
 const [trunksOpen, setTrunksOpen] = useState(false);
 const [selectedCert, setSelectedCert] = useState<CertEntry | null>(null);
 const [suggesting, setSuggesting] = useState(false);
 const validTrunks = trunks.filter(t => t.trim().length > 0);
 const navigate = useNavigate();
 /* Hooks & Store */
 const { openSettingsPanel } = useUIStore();
 const { recentSubjects } = useGenerationStore();
 const { isAuthenticated } = useAuthStore();
 const canGenerate = isAuthenticated && isGenerationAllowed();
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
 const filteredCerts = useMemo(() => {
 if (!subject.trim() || subject.length < 2) return [];
 const q = subject.toLowerCase();
 return ALL_CERTS.filter(c =>
 c.name.toLowerCase().includes(q) ||
 c.code.toLowerCase().includes(q) ||
 c.provider.toLowerCase().includes(q)
 ).slice(0, 6);
 }, [subject]);
 const handleSelectSuggestion = (name: string) => {
 setSubject(name);
 setShowSuggestions(false);
 };
 const handleSelectCert = (cert: CertEntry) => {
 setSelectedCert(cert);
 setSubject(`${cert.name} (${cert.code})`);
 const domains = getDomainsAsTrunks(cert);
 setTrunks(domains);
 setTrunksOpen(true);
 const objectives = getTasksAsObjectives(cert);
 setObjectivesText(objectives.join('\n'));
 setObjectivesOpen(true);
 setShowSuggestions(false);
 setShowPreview(true);
 };
 const handleClearCert = () => {
 setSelectedCert(null);
 setSubject('');
 setTrunks(['', '']);
 setTrunksOpen(false);
 setObjectivesText('');
 setObjectivesOpen(false);
 setShowPreview(false);
 };
 const handleSuggestStructure = async () => {
 if (!subject.trim() || suggesting || !canGenerate) return;
 setSuggesting(true);
 try {
 const userId = useAuthStore.getState().user?.id || 'anonymous';
 const result = await conceptsApi.suggestStructure({ subject: subject.trim(), userId });
 if (result.domains && result.domains.length > 0) {
 const domainNames = result.domains.map(d => d.name);
 setTrunks(domainNames);
 setTrunksOpen(true);
 const objectives = result.domains.flatMap(d =>
 d.tasks.map(t => `[${d.name} - ${d.weight}%] ${t}`)
 );
 if (objectives.length > 0) {
 setObjectivesText(objectives.join('\n'));
 setObjectivesOpen(true);
 setShowPreview(true);
 }
 }
 } catch (err) {
 console.error('[Home] Suggest structure failed:', err);
 toast.error('Unable to analyze subject structure. Please try again.');
 } finally {
 setSuggesting(false);
 }
 };
 const addTrunk = () => {
 if (trunks.length < 6) setTrunks([...trunks, '']);
 };
 const removeTrunk = (index: number) => {
 if (trunks.length > 2) setTrunks(trunks.filter((_, i) => i !== index));
 };
 const updateTrunk = (index: number, value: string) => {
 const updated = [...trunks];
 updated[index] = value;
 setTrunks(updated);
 };
 const handleGenerate = () => {
 if (!canGenerate || !subject.trim() || (validTrunks.length < 2 && parsedObjectives.length === 0)) return;
 setShowSuggestions(false);
 const params = new URLSearchParams();
 if (parsedObjectives.length > 0) {
 params.set('context', parsedObjectives.join('\n'));
 }
 if (validTrunks.length >= 2) {
 params.set('trunks', JSON.stringify(validTrunks));
 }
 const query = params.toString();
 navigate(`/generate/${encodeURIComponent(subject)}${query ? `?${query}` : ''}`);
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
 <SensaAnimLogo size="3xl" />
 </div>
 {canGenerate ? (
 <>
 {selectedCert && (
 <div className={styles.certBadge}>
 <Award size={14} />
 <span>{selectedCert.name} ({selectedCert.code})</span>
 <button type="button" onClick={handleClearCert} className={styles.certBadgeClear}>
 <X size={12} />
 </button>
 </div>
 )}
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
 if (selectedCert) {
 setSelectedCert(null);
 setTrunks(['', '']);
 setTrunksOpen(false);
 setObjectivesText('');
 setObjectivesOpen(false);
 setShowPreview(false);
 }
 }}
 onFocus={() => setShowSuggestions(true)}
 onBlur={() => setTimeout(() => setShowSuggestions(false), UI_TIMINGS.BLUR_DELAY)}
 onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
 placeholder="Search certifications or enter any subject..."
 className={styles.input}
 autoFocus
 />
 <AnimatePresence>
 {showSuggestions && subject.trim().length >= 2 && !selectedCert && (filteredCerts.length > 0 || filteredSuggestions.length > 0 || true) && (
 <motion.div
 className={styles.unifiedDropdown}
 initial={{ opacity: 0, y: -10 }}
 animate={{ opacity: 1, y: 0 }}
 exit={{ opacity: 0, y: -10 }}
 >
 {filteredCerts.length > 0 && (
 <div className={styles.dropdownSection}>
 <div className={styles.dropdownSectionLabel}>Certification Exams</div>
 {filteredCerts.map(cert => (
 <button
 key={cert.id}
 className={styles.certItem}
 onMouseDown={() => handleSelectCert(cert)}
 >
 <div className={styles.certItemMain}>
 <span className={styles.certItemName}>{cert.name}</span>
 <span className={styles.certItemCode}>{cert.provider} · {cert.code}</span>
 </div>
 <div className={styles.certItemMeta}>
 <span className={styles.certItemDomains}>{cert.domains.length} domains</span>
 </div>
 </button>
 ))}
 </div>
 )}
 {filteredSuggestions.length > 0 && (
 <div className={styles.dropdownSection}>
 <div className={styles.dropdownSectionLabel}>Suggested Topics</div>
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
 </div>
 )}
 <div className={styles.dropdownSection}>
 <button
 className={styles.aiSuggestOption}
 onMouseDown={handleSuggestStructure}
 disabled={suggesting}
 >
 {suggesting ? <Loader2 size={14} className={styles.spinning} /> : <Wand2 size={14} />}
 <span>{suggesting ? 'Analyzing structure...' : `Use AI to analyze "${subject.trim().slice(0, 40)}${subject.trim().length > 40 ? '...' : ''}" structure`}</span>
 </button>
 </div>
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
 <span>{parsedObjectives.length > 0 ? `${parsedObjectives.length} Objectives Loaded` : 'Exam Objectives'}</span>
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
 placeholder={'Paste exam objectives or syllabus here...\nAuto-cleaned on paste.'}
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
 <div className={styles.trunksSection}>
 <button
 className={styles.objectivesToggle}
 onClick={() => setTrunksOpen(!trunksOpen)}
 >
 <GitBranch size={14} />
 <span>{validTrunks.length >= 2 ? `${validTrunks.length} Domains Locked` : 'Exam Domains'}</span>
 {trunksOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
 </button>
 <AnimatePresence>
 {trunksOpen && (
 <motion.div
 initial={{ height: 0, opacity: 0 }}
 animate={{ height: 'auto', opacity: 1 }}
 exit={{ height: 0, opacity: 0 }}
 transition={{ duration: 0.2 }}
 className={styles.trunksBody}
 >
 <div className={styles.trunksList}>
 {trunks.map((trunk, i) => (
 <div key={i} className={styles.trunkRow}>
 <span className={styles.trunkIndex}>{i + 1}</span>
 <input
 type="text"
 value={trunk}
 onChange={e => updateTrunk(i, e.target.value)}
 placeholder={`Domain ${i + 1}`}
 className={styles.trunkInput}
 />
 {trunks.length > 2 && (
 <button
 type="button"
 onClick={() => removeTrunk(i)}
 className={styles.trunkRemove}
 >
 <X size={14} />
 </button>
 )}
 </div>
 ))}
 </div>
 {trunks.length < 6 && (
 <button type="button" onClick={addTrunk} className={styles.trunkAdd}>
 <Plus size={14} /> Add Domain
 </button>
 )}
 </motion.div>
 )}
 </AnimatePresence>
 </div>
 <div className={styles.groundingStatus}>
 {validTrunks.length >= 2 ? (
 <div className={styles.groundedStatus}>
 <GitBranch size={14} />
 <span>{validTrunks.length} domains{parsedObjectives.length > 0 ? ` · ${parsedObjectives.length} objectives` : ''}</span>
 </div>
 ) : parsedObjectives.length > 0 ? (
 <div className={styles.groundedStatus}>
 <Target size={14} />
 <span>{parsedObjectives.length} objectives loaded</span>
 </div>
 ) : (
 <div className={styles.ungroundedStatus}>
 <span>No objectives or domains set</span>
 </div>
 )}
 </div>
 <button
 onClick={handleGenerate}
 disabled={!subject.trim() || (validTrunks.length < 2 && parsedObjectives.length === 0)}
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
 </>
 ) : (
 <div className={styles.restrictedMessage}>
 <p className={styles.restrictedTitle}>Generation Restricted</p>
 <p className={styles.restrictedText}>
 If you need a subject generated, please contact an admin.
 </p>
 <p className={styles.restrictedText}>
 You can still browse and study existing content in the library.
 </p>
 <button onClick={() => navigate('/library')} className={styles.generateButton}>
 <Archive size={18} />
 Go to Library
 </button>
 </div>
 )}
 </motion.div>
 <div className={styles.actionButtons}>
 {isAuthenticated ? (
 <>
 <button onClick={() => setShowCloudLibrary(true)} className={styles.cloudLibraryButton}>
 <Cloud size={18} />
 Cloud Library
 </button>
 <button onClick={() => navigate('/library')} className={styles.savedButton}>
 <Archive size={18} />
 Saved Results
 </button>
 </>
 ) : (
 <>
 <button onClick={() => navigate('/login')} className={styles.savedButton}>
 Sign In
 </button>
 <button onClick={() => navigate('/signup')} className={styles.cloudLibraryButton}>
 Create Account
 </button>
 </>
 )}
 <button onClick={openSettingsPanel} className={styles.settingsButton}>
 Settings
 </button>
 </div>
 {/* Cloud Library Modal */}
 <CloudLibraryModal
 isOpen={showCloudLibrary}
 onClose={() => setShowCloudLibrary(false)}
 onUpdate={() => {}}
 />
 </div>
 </div >
 );
}
