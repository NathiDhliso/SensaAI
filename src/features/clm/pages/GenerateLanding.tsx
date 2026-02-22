/**
 * Generate Landing Page - CLM Content Generation Entry Point
 * Curator interface for generating new learning content
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, FileText, Upload } from 'lucide-react';
import styles from './GenerateLanding.module.css';

export default function GenerateLanding() {
  const navigate = useNavigate();
  const [subject, setSubject] = useState('');
  const [context, setContext] = useState('');
  const [file, setFile] = useState<File | null>(null);

  const handleGenerate = () => {
    if (!subject.trim()) return;

    const encodedSubject = encodeURIComponent(subject.trim());
    
    if (context.trim() || file) {
      navigate(`/curator/generate/${encodedSubject}`, {
        state: {
          context: context.trim() || null,
          file: file || null
        }
      });
    } else {
      navigate(`/curator/generate/${encodedSubject}`);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <Sparkles className={styles.headerIcon} size={32} />
        <h1 className={styles.title}>Generate Learning Content</h1>
        <p className={styles.subtitle}>
          Create comprehensive learning materials for any subject
        </p>
      </div>

      <div className={styles.form}>
        <div className={styles.field}>
          <label htmlFor="subject" className={styles.label}>
            Subject <span className={styles.required}>*</span>
          </label>
          <input
            id="subject"
            type="text"
            className={styles.input}
            placeholder="e.g., AZ-104: Microsoft Azure Administrator"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
          />
          <p className={styles.hint}>
            Enter the subject or certification you want to generate content for
          </p>
        </div>

        <div className={styles.field}>
          <label htmlFor="context" className={styles.label}>
            Exam Objectives (Optional)
          </label>
          <textarea
            id="context"
            className={styles.textarea}
            placeholder="Paste exam objectives or learning outcomes here..."
            value={context}
            onChange={(e) => setContext(e.target.value)}
            rows={8}
          />
          <p className={styles.hint}>
            Provide exam objectives to ground the content generation
          </p>
        </div>

        <div className={styles.field}>
          <label className={styles.label}>
            <FileText size={16} />
            Upload Objectives File (Optional)
          </label>
          <div className={styles.fileUpload}>
            <input
              type="file"
              id="file-upload"
              className={styles.fileInput}
              accept=".txt,.pdf,.doc,.docx"
              onChange={handleFileChange}
            />
            <label htmlFor="file-upload" className={styles.fileLabel}>
              <Upload size={20} />
              {file ? file.name : 'Choose file'}
            </label>
          </div>
          <p className={styles.hint}>
            Upload a file containing exam objectives or syllabus
          </p>
        </div>

        <button
          className={styles.generateButton}
          onClick={handleGenerate}
          disabled={!subject.trim()}
        >
          <Sparkles size={20} />
          Generate Content
        </button>
      </div>

      <div className={styles.info}>
        <h3 className={styles.infoTitle}>What happens next?</h3>
        <ul className={styles.infoList}>
          <li>AI analyzes the subject and objectives</li>
          <li>Generates comprehensive learning concepts</li>
          <li>Creates knowledge graph structure</li>
          <li>Validates content quality</li>
          <li>Saves to library for learner access</li>
        </ul>
      </div>
    </div>
  );
}
