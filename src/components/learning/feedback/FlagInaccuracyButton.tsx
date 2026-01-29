/**
 * FlagInaccuracyButton Component
 * 
 * Allows users to report content issues with categorized feedback:
 * - outdated: Information no longer accurate
 * - incorrect: Factually wrong information
 * - not-on-exam: Content not relevant to exam
 * - broken-link: Official source link doesn't work
 */

import React, { useState, useCallback } from 'react';
import { Flag, X, AlertTriangle, Clock, Link2Off, BookX, Send, CheckCircle } from 'lucide-react';
import { UI_TIMINGS } from '@/shared/constants/ui-constants';

// Types
type FlagType = 'outdated' | 'incorrect' | 'not-on-exam' | 'broken-link';

interface ContentFlag {
  type: FlagType;
  conceptId: string;
  conceptTitle: string;
  description: string;
  timestamp: string;
  userId?: string;
  blueprintVersion?: string;
  officialSourceUrl?: string;
}

interface FlagInaccuracyButtonProps {
  conceptId: string;
  conceptTitle: string;
  blueprintVersion?: string;
  officialSourceUrl?: string;
  onSubmit: (flag: ContentFlag) => Promise<void>;
  disabled?: boolean;
  className?: string;
}

// Flag type configuration
const FLAG_TYPES: Record<FlagType, {
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  bgColor: string;
  placeholder: string;
  autoTriageAction: string;
}> = {
  outdated: {
    label: 'Outdated Information',
    description: 'This information was accurate but is now out of date',
    icon: Clock,
    color: 'text-amber-400',
    bgColor: 'bg-amber-500/10 hover:bg-amber-500/20',
    placeholder: 'What has changed? (e.g., "This feature was deprecated in v2.0")',
    autoTriageAction: 'Queue for blueprint re-sync',
  },
  incorrect: {
    label: 'Incorrect Information',
    description: 'This information is factually wrong',
    icon: AlertTriangle,
    color: 'text-red-400',
    bgColor: 'bg-red-500/10 hover:bg-red-500/20',
    placeholder: 'What is incorrect? Please provide the correct information if known.',
    autoTriageAction: 'Flag for immediate review',
  },
  'not-on-exam': {
    label: 'Not on Exam',
    description: 'This topic is not covered in the current exam',
    icon: BookX,
    color: 'text-purple-400',
    bgColor: 'bg-purple-500/10 hover:bg-purple-500/20',
    placeholder: 'Optional: How do you know this isn\'t on the exam?',
    autoTriageAction: 'Verify against latest blueprint',
  },
  'broken-link': {
    label: 'Broken Link',
    description: 'The official source link no longer works',
    icon: Link2Off,
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/10 hover:bg-blue-500/20',
    placeholder: 'Optional: Do you have a working alternative link?',
    autoTriageAction: 'Auto-search for updated URL',
  },
};

// Modal component
function FlagModal({
  isOpen,
  onClose,
  conceptTitle,
  onSubmit,
  isSubmitting,
  isSubmitted,
}: {
  isOpen: boolean;
  onClose: () => void;
  conceptTitle: string;
  onSubmit: (type: FlagType, description: string) => void;
  isSubmitting: boolean;
  isSubmitted: boolean;
}) {
  const [selectedType, setSelectedType] = useState<FlagType | null>(null);
  const [description, setDescription] = useState('');

  const handleSubmit = () => {
    if (selectedType) {
      onSubmit(selectedType, description);
    }
  };

  const handleClose = () => {
    setSelectedType(null);
    setDescription('');
    onClose();
  };

  if (!isOpen) return null;

  // Success state
  if (isSubmitted) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div 
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          onClick={handleClose}
        />
        <div className="relative bg-gray-900 border border-gray-700 rounded-xl shadow-2xl p-6 w-full max-w-md animate-in zoom-in-95 duration-200">
          <div className="text-center space-y-4">
            <div className="w-16 h-16 mx-auto rounded-full bg-emerald-500/20 flex items-center justify-center">
              <CheckCircle className="w-8 h-8 text-emerald-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">
                Thank You for Your Feedback
              </h3>
              <p className="text-sm text-gray-400 mt-1">
                Your report helps us improve content accuracy for everyone.
              </p>
            </div>
            <button
              onClick={handleClose}
              className="w-full py-2 px-4 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={handleClose}
      />
      
      {/* Modal */}
      <div className="relative bg-gray-900 border border-gray-700 rounded-xl shadow-2xl w-full max-w-lg animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <div className="flex items-center gap-2">
            <Flag className="w-5 h-5 text-gray-400" />
            <h2 className="text-lg font-semibold text-white">
              Flag Inaccurate Content
            </h2>
          </div>
          <button
            onClick={handleClose}
            className="p-1 text-gray-400 hover:text-white transition-colors rounded-lg hover:bg-gray-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* Concept being flagged */}
          <div className="p-3 bg-gray-800/50 rounded-lg border border-gray-700">
            <span className="text-xs text-gray-500 uppercase tracking-wide">
              Flagging content for
            </span>
            <p className="text-white font-medium mt-1 truncate">
              {conceptTitle}
            </p>
          </div>

          {/* Flag type selection */}
          <div className="space-y-2">
            <label className="text-sm text-gray-400">
              What's the issue?
            </label>
            <div className="grid grid-cols-2 gap-2">
              {(Object.entries(FLAG_TYPES) as [FlagType, typeof FLAG_TYPES[FlagType]][]).map(
                ([type, config]) => {
                  const Icon = config.icon;
                  const isSelected = selectedType === type;
                  
                  return (
                    <button
                      key={type}
                      onClick={() => setSelectedType(type)}
                      className={`
                        p-3 rounded-lg border text-left transition-all
                        ${isSelected 
                          ? `${config.bgColor} border-current ${config.color}` 
                          : 'border-gray-700 hover:border-gray-600 text-gray-300 hover:text-white'
                        }
                      `}
                    >
                      <div className="flex items-center gap-2">
                        <Icon className={`w-4 h-4 ${isSelected ? config.color : ''}`} />
                        <span className="text-sm font-medium">{config.label}</span>
                      </div>
                      <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                        {config.description}
                      </p>
                    </button>
                  );
                }
              )}
            </div>
          </div>

          {/* Description input */}
          {selectedType && (
            <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-200">
              <label className="text-sm text-gray-400">
                Additional details
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={FLAG_TYPES[selectedType].placeholder}
                className="
                  w-full p-3 bg-gray-800 border border-gray-700 rounded-lg
                  text-white placeholder-gray-500
                  focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500
                  resize-none
                "
                rows={3}
              />
              <p className="text-xs text-gray-500">
                Auto-triage: {FLAG_TYPES[selectedType].autoTriageAction}
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 p-4 border-t border-gray-700">
          <button
            onClick={handleClose}
            className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
            disabled={isSubmitting}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!selectedType || isSubmitting}
            className={`
              px-4 py-2 rounded-lg font-medium flex items-center gap-2
              transition-all duration-200
              ${selectedType && !isSubmitting
                ? 'bg-blue-600 hover:bg-blue-500 text-white'
                : 'bg-gray-700 text-gray-500 cursor-not-allowed'
              }
            `}
          >
            {isSubmitting ? (
              <>
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Submitting...
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                Submit Flag
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// Main button component
export function FlagInaccuracyButton({
  conceptId,
  conceptTitle,
  blueprintVersion,
  officialSourceUrl,
  onSubmit,
  disabled = false,
  className = '',
}: FlagInaccuracyButtonProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = useCallback(async (type: FlagType, description: string) => {
    setIsSubmitting(true);
    
    try {
      const flag: ContentFlag = {
        type,
        conceptId,
        conceptTitle,
        description,
        timestamp: new Date().toISOString(),
        blueprintVersion,
        officialSourceUrl,
      };

      await onSubmit(flag);
      setIsSubmitted(true);
    } catch (error) {
      console.error('Failed to submit flag:', error);
      // Could add error state here
    } finally {
      setIsSubmitting(false);
    }
  }, [conceptId, conceptTitle, blueprintVersion, officialSourceUrl, onSubmit]);

  const handleCloseModal = useCallback(() => {
    setIsModalOpen(false);
    // Reset submitted state after animation
    setTimeout(() => setIsSubmitted(false), UI_TIMINGS.PANEL_EXIT_DELAY);
  }, []);

  return (
    <>
      <button
        onClick={() => setIsModalOpen(true)}
        disabled={disabled}
        className={`
          inline-flex items-center gap-1.5 px-3 py-1.5
          text-sm text-gray-400 hover:text-red-400
          bg-transparent hover:bg-red-500/10
          border border-transparent hover:border-red-500/30
          rounded-lg transition-all duration-200
          disabled:opacity-50 disabled:cursor-not-allowed
          ${className}
        `}
        aria-label="Flag this content as inaccurate"
      >
        <Flag className="w-4 h-4" />
        <span>Flag Inaccuracy</span>
      </button>

      <FlagModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        conceptTitle={conceptTitle}
        onSubmit={handleSubmit}
        isSubmitting={isSubmitting}
        isSubmitted={isSubmitted}
      />
    </>
  );
}

// Compact icon-only version
export function FlagInaccuracyIcon({
  onClick,
  disabled = false,
  className = '',
}: {
  onClick: () => void;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        p-1.5 text-gray-500 hover:text-red-400
        hover:bg-red-500/10 rounded transition-colors
        disabled:opacity-50 disabled:cursor-not-allowed
        ${className}
      `}
      aria-label="Flag as inaccurate"
      title="Flag as inaccurate"
    >
      <Flag className="w-4 h-4" />
    </button>
  );
}

export type { ContentFlag, FlagType };
export default FlagInaccuracyButton;
