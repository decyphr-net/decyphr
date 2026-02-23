export function sanitizeExposureTokens(tokens: string[], max = 120): string[] {
  const seen = new Set<string>();
  const out: string[] = [];

  for (const raw of tokens) {
    const value = raw.trim().toLowerCase();
    if (value.length <= 1) continue;
    if (/^[\d\p{P}\p{S}]+$/u.test(value)) continue;
    if (seen.has(value)) continue;

    seen.add(value);
    out.push(value);
    if (out.length >= max) break;
  }

  return out;
}

export function interactionTypeForExposure(source: 'render' | 'hover') {
  return source === 'render' ? 'passive_read' : 'course_hover_lookup';
}
