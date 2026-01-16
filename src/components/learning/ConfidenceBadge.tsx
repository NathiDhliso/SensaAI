/**
 * ConfidenceBadge Component
 * 
 * Displays a visual indicator of content confidence level (HIGH/MEDIUM/LOW)
 * with tooltip showing score breakdown.
 */

import React, { useState } from 'react';
import { Shield, ShieldCheck, ShieldAlert, Info } from 'lucide-react';

// Types
type ConfidenceLevel = 'HIGH' | 'MEDIUM' | 'LOW';

interface ConfidenceBreakdown {
  officialLink: number;
  blueprintMatch: number;
  verifiableData: number;
}

interface ConfidenceScore {
  level: ConfidenceLevel;
  score: number;
  breakdown: ConfidenceBreakdown;
  details: string[];
}

interface ConfidenceBadgeProps {
  confidence: ConfidenceScore;
  size?: 'sm' | 'md' | 'lg';
  showScore?: boolean;
  showTooltip?: boolean;
  className?: string;
}

// Constants
const LEVEL_CONFIG: Record<ConfidenceLevel, {
  label: string;
  color: string;
  bgColor: string;
  borderColor: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
}> = {
  HIGH: {
    label: 'High Confidence',
    color: 'text-emerald-400',
    bgColor: 'bg-emerald-500/10',
    borderColor: 'border-emerald-500/30',
    icon: ShieldCheck,
    description: 'Content verified against official sources and exam blueprint',
  },
  MEDIUM: {
    label: 'Medium Confidence',
    color: 'text-amber-400',
    bgColor: 'bg-amber-500/10',
    borderColor: 'border-amber-500/30',
    icon: Shield,
    description: 'Content partially verified - some sources pending validation',
  },
  LOW: {
    label: 'Low Confidence',
    color: 'text-red-400',
    bgColor: 'bg-red-500/10',
    borderColor: 'border-red-500/30',
    icon: ShieldAlert,
    description: 'Content needs verification - verify with official documentation',
  },
};

const SIZE_CONFIG = {
  sm: {
    badge: 'px-2 py-0.5 text-xs gap-1',
    icon: 'w-3 h-3',
    tooltip: 'w-64',
  },
  md: {
    badge: 'px-3 py-1 text-sm gap-1.5',
    icon: 'w-4 h-4',
    tooltip: 'w-72',
  },
  lg: {
    badge: 'px-4 py-1.5 text-base gap-2',
    icon: 'w-5 h-5',
    tooltip: 'w-80',
  },
};

const MAX_SCORES = {
  officialLink: 50,
  blueprintMatch: 30,
  verifiableData: 20,
};

// Score bar component
function ScoreBar({ 
  label, 
  score, 
  maxScore, 
  color 
}: { 
  label: string; 
  score: number; 
  maxScore: number; 
  color: string;
}) {
  const percentage = (score / maxScore) * 100;
  
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-gray-400">{label}</span>
        <span className="text-gray-300 font-mono">{score}/{maxScore}</span>
      </div>
      <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden">
        <div 
          className={`h-full rounded-full transition-all duration-300 ${color}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

// Main component
export function ConfidenceBadge({
  confidence,
  size = 'md',
  showScore = true,
  showTooltip = true,
  className = '',
}: ConfidenceBadgeProps) {
  const [isTooltipVisible, setIsTooltipVisible] = useState(false);
  
  const config = LEVEL_CONFIG[confidence.level];
  const sizeConfig = SIZE_CONFIG[size];
  const Icon = config.icon;

  return (
    <div className={`relative inline-block ${className}`}>
      {/* Badge */}
      <button
        className={`
          inline-flex items-center rounded-full font-medium
          border transition-all duration-200 cursor-help
          ${sizeConfig.badge}
          ${config.bgColor}
          ${config.borderColor}
          ${config.color}
          hover:opacity-90
        `}
        onMouseEnter={() => setIsTooltipVisible(true)}
        onMouseLeave={() => setIsTooltipVisible(false)}
        onClick={() => setIsTooltipVisible(!isTooltipVisible)}
        aria-label={`${config.label}: ${confidence.score} out of 100`}
      >
        <Icon className={sizeConfig.icon} />
        <span>{confidence.level}</span>
        {showScore && (
          <span className="opacity-70 font-mono">
            {confidence.score}
          </span>
        )}
      </button>

      {/* Tooltip */}
      {showTooltip && isTooltipVisible && (
        <div 
          className={`
            absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2
            ${sizeConfig.tooltip}
            bg-gray-900 border border-gray-700 rounded-lg shadow-xl
            p-3 space-y-3
            animate-in fade-in slide-in-from-bottom-2 duration-200
          `}
          role="tooltip"
        >
          {/* Arrow */}
          <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-px">
            <div className="border-8 border-transparent border-t-gray-700" />
            <div className="absolute -top-[1px] left-1/2 -translate-x-1/2 border-8 border-transparent border-t-gray-900" />
          </div>

          {/* Header */}
          <div className="flex items-start gap-2">
            <Icon className={`w-5 h-5 ${config.color} flex-shrink-0 mt-0.5`} />
            <div>
              <div className={`font-semibold ${config.color}`}>
                {config.label}
              </div>
              <div className="text-xs text-gray-400 mt-0.5">
                {config.description}
              </div>
            </div>
          </div>

          {/* Score breakdown */}
          <div className="space-y-2 pt-2 border-t border-gray-700">
            <ScoreBar 
              label="📎 Official Source"
              score={confidence.breakdown.officialLink}
              maxScore={MAX_SCORES.officialLink}
              color="bg-blue-500"
            />
            <ScoreBar 
              label="📋 Blueprint Match"
              score={confidence.breakdown.blueprintMatch}
              maxScore={MAX_SCORES.blueprintMatch}
              color="bg-purple-500"
            />
            <ScoreBar 
              label="✓ Verifiable Data"
              score={confidence.breakdown.verifiableData}
              maxScore={MAX_SCORES.verifiableData}
              color="bg-emerald-500"
            />
          </div>

          {/* Total score */}
          <div className="flex justify-between items-center pt-2 border-t border-gray-700">
            <span className="text-sm text-gray-400">Total Score</span>
            <span className={`text-lg font-bold ${config.color}`}>
              {confidence.score}/100
            </span>
          </div>

          {/* Details */}
          {confidence.details.length > 0 && (
            <div className="pt-2 border-t border-gray-700 space-y-1">
              <div className="flex items-center gap-1 text-xs text-gray-500">
                <Info className="w-3 h-3" />
                <span>Details</span>
              </div>
              <ul className="text-xs text-gray-400 space-y-0.5">
                {confidence.details.slice(0, 3).map((detail, i) => (
                  <li key={i} className="truncate">• {detail}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Compact inline version
export function ConfidenceBadgeInline({
  level,
  score,
}: {
  level: ConfidenceLevel;
  score: number;
}) {
  const config = LEVEL_CONFIG[level];
  const Icon = config.icon;

  return (
    <span className={`inline-flex items-center gap-1 ${config.color}`}>
      <Icon className="w-3 h-3" />
      <span className="text-xs font-medium">{level}</span>
      <span className="text-xs opacity-60">({score})</span>
    </span>
  );
}

// Aggregate confidence display for multiple concepts
export function AggregateConfidenceBadge({
  average,
  distribution,
}: {
  average: number;
  distribution: Record<ConfidenceLevel, number>;
}) {
  const level: ConfidenceLevel = 
    average >= 80 ? 'HIGH' : 
    average >= 50 ? 'MEDIUM' : 'LOW';
  
  const config = LEVEL_CONFIG[level];
  const total = distribution.HIGH + distribution.MEDIUM + distribution.LOW;

  return (
    <div className={`
      p-3 rounded-lg border
      ${config.bgColor} ${config.borderColor}
    `}>
      <div className="flex items-center justify-between mb-2">
        <span className={`font-medium ${config.color}`}>
          Overall Confidence
        </span>
        <span className={`text-xl font-bold ${config.color}`}>
          {average}%
        </span>
      </div>
      
      {/* Distribution bar */}
      <div className="h-2 bg-gray-700 rounded-full overflow-hidden flex">
        {distribution.HIGH > 0 && (
          <div 
            className="bg-emerald-500 transition-all"
            style={{ width: `${(distribution.HIGH / total) * 100}%` }}
          />
        )}
        {distribution.MEDIUM > 0 && (
          <div 
            className="bg-amber-500 transition-all"
            style={{ width: `${(distribution.MEDIUM / total) * 100}%` }}
          />
        )}
        {distribution.LOW > 0 && (
          <div 
            className="bg-red-500 transition-all"
            style={{ width: `${(distribution.LOW / total) * 100}%` }}
          />
        )}
      </div>
      
      {/* Legend */}
      <div className="flex justify-between mt-2 text-xs text-gray-400">
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
          High ({distribution.HIGH})
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-amber-500" />
          Medium ({distribution.MEDIUM})
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-red-500" />
          Low ({distribution.LOW})
        </span>
      </div>
    </div>
  );
}

export default ConfidenceBadge;
