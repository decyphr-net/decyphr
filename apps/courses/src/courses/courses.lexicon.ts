const ENGLISH_STOPWORDS = new Set([
  'a',
  'an',
  'and',
  'are',
  'as',
  'at',
  'be',
  'but',
  'by',
  'can',
  'card',
  'cash',
  'do',
  'for',
  'from',
  'get',
  'goodbye',
  'hello',
  'here',
  'how',
  'i',
  'if',
  'in',
  'is',
  'it',
  'its',
  'me',
  'milk',
  'my',
  'of',
  'on',
  'or',
  'please',
  'sugar',
  'table',
  'tea',
  'that',
  'the',
  'there',
  'they',
  'this',
  'to',
  'was',
  'we',
  'what',
  'where',
  'with',
  'you',
  'your',
  'welcome',
]);

export function sanitizeExposureTokens(tokens: string[], max = 120): string[] {
  const seen = new Set<string>();
  const out: string[] = [];

  for (const raw of tokens) {
    const value = raw.trim().toLowerCase();
    if (value.length <= 1) continue;
    if (/^[\d\p{P}\p{S}]+$/u.test(value)) continue;
    if (ENGLISH_STOPWORDS.has(value)) continue;
    if (seen.has(value)) continue;

    seen.add(value);
    out.push(value);
    if (out.length >= max) break;
  }

  return out;
}

export function interactionTypeForExposure(
  source: 'render' | 'hover' | 'gloss' | 'swap_correct' | 'swap_incorrect',
) {
  if (source === 'render') return 'passive_read';
  if (source === 'hover') return 'course_hover_lookup';
  if (source === 'gloss') return 'course_gloss_lookup';
  if (source === 'swap_correct') return 'course_swap_correct';
  return 'course_swap_incorrect';
}
