// Compatibility re-export — the canonical implementation lives in crisisDetector.js.
// This file exists so that existing imports of crisisDetector.jsx continue to work.
export {
  isExamContextFalsePositive,
  isGeneralDistressFalsePositive,
  isDirectNegationFalsePositive,
  detectCrisisLanguage,
  detectCrisisWithReason,
} from './crisisDetector.js';
