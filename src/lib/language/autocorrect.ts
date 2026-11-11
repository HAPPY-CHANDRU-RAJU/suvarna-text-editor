import type { AutoCorrectRule } from './types';

// Typed-as-you-go replacements, like Word's AutoCorrect list. The Kannada
// entries cover the most common mahaprana / ottakshara slips.
export const BUILTIN_RULES: AutoCorrectRule[] = [
  { from: '(c)', to: '©' },
  { from: '(r)', to: '®' },
  { from: '(tm)', to: '™' },
  { from: '--', to: '–' },
  { from: '...', to: '…' },
  { from: '->', to: '→' },
  { from: '<-', to: '←' },
  { from: 'ಸಂದರ್ಬ', to: 'ಸಂದರ್ಭ' },
  { from: 'ಆಶಿರ್ವಾದ', to: 'ಆಶೀರ್ವಾದ' },
  { from: 'ಪ್ರಾರಂಬ', to: 'ಪ್ರಾರಂಭ' },
  { from: 'ಅರ್ಥಿಕ', to: 'ಆರ್ಥಿಕ' },
  { from: 'ವಿದ್ಯಾರ್ತಿ', to: 'ವಿದ್ಯಾರ್ಥಿ' },
  { from: 'ವಿದ್ಯಾರ್ತಿಗಳು', to: 'ವಿದ್ಯಾರ್ಥಿಗಳು' },
  { from: 'ಶುಭಾಷಯ', to: 'ಶುಭಾಶಯ' },
  { from: 'ಶುಭಾಷಯಗಳು', to: 'ಶುಭಾಶಯಗಳು' },
  { from: 'ದನ್ಯವಾದ', to: 'ಧನ್ಯವಾದ' },
  { from: 'ದನ್ಯವಾದಗಳು', to: 'ಧನ್ಯವಾದಗಳು' },
  { from: 'ಅಬಿನಂದನೆ', to: 'ಅಭಿನಂದನೆ' },
  { from: 'ಅಬಿನಂದನೆಗಳು', to: 'ಅಭಿನಂದನೆಗಳು' },
  { from: 'ಬಾರತ', to: 'ಭಾರತ' },
  { from: 'ಬಾಷೆ', to: 'ಭಾಷೆ' },
  { from: 'ದರ್ಮ', to: 'ಧರ್ಮ' },
  { from: 'ಅದ್ಯಕ್ಷ', to: 'ಅಧ್ಯಕ್ಷ' },
  { from: 'ಮುಕ್ಯಮಂತ್ರಿ', to: 'ಮುಖ್ಯಮಂತ್ರಿ' },
  { from: 'ಪರಿಕ್ಷೆ', to: 'ಪರೀಕ್ಷೆ' },
  { from: 'ಸಿಕ್ಷಣ', to: 'ಶಿಕ್ಷಣ' },
  { from: 'ಉದ್ಗಾಟನೆ', to: 'ಉದ್ಘಾಟನೆ' },
  { from: 'ಅಭಿವೃದ್ದಿ', to: 'ಅಭಿವೃದ್ಧಿ' },
  { from: 'ಬುದ್ದಿ', to: 'ಬುದ್ಧಿ' },
  { from: 'ಶುದ್ದ', to: 'ಶುದ್ಧ' },
  { from: 'ಅರ್ತ', to: 'ಅರ್ಥ' },
  { from: 'ಸ್ತಳ', to: 'ಸ್ಥಳ' },
  { from: 'ಸ್ತಿತಿ', to: 'ಸ್ಥಿತಿ' },
  { from: 'ಪ್ರತಮ', to: 'ಪ್ರಥಮ' },
  { from: 'ಅಬ್ಯಾಸ', to: 'ಅಭ್ಯಾಸ' },
  { from: 'ವಿದಾನ', to: 'ವಿಧಾನ' },
  { from: 'ಸೌಲಬ್ಯ', to: 'ಸೌಲಭ್ಯ' },
];

/** Characters that end a word and trigger an AutoCorrect lookup. */
export const WORD_TERMINATORS = /^[\s.,;:!?)"'\]}।]$/;

export function buildRuleMap(userRules: AutoCorrectRule[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const rule of BUILTIN_RULES) map.set(rule.from, rule.to);
  // User rules win over the built-ins.
  for (const rule of userRules) if (rule.from) map.set(rule.from, rule.to);
  return map;
}

/**
 * Finds the rule matching the end of `before` (the text typed so far in the
 * paragraph). Returns the matched source text and its replacement.
 */
export function matchRule(before: string, rules: Map<string, string>): { from: string; to: string } | null {
  // Symbol rules can be glued to the previous word ("word..."), word rules cannot.
  for (const [from, to] of rules) {
    if (!before.endsWith(from)) continue;
    const isWordRule = /[ಀ-೿\p{L}]/u.test(from[0]);
    if (isWordRule) {
      const prev = before[before.length - from.length - 1];
      if (prev !== undefined && /[ಀ-೿\p{L}\p{N}]/u.test(prev)) continue;
    }
    return { from, to };
  }
  return null;
}
