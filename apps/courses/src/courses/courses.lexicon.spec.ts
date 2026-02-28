import { interactionTypeForExposure, sanitizeExposureTokens } from './courses.lexicon';

describe('courses.lexicon', () => {
  it('dedupes and sanitizes tokens', () => {
    const out = sanitizeExposureTokens([
      ' Dia ',
      'dia',
      'hello',
      '---',
      '12',
      'go',
      'Mhaith',
      'a',
      '  ',
    ]);

    expect(out).toEqual(['dia', 'go', 'mhaith']);
  });

  it('respects max token cap', () => {
    const tokens = Array.from({ length: 12 }, (_, idx) => `focal${idx + 1}`);
    const out = sanitizeExposureTokens(tokens, 5);
    expect(out).toHaveLength(5);
  });

  it('maps exposure source to interaction type', () => {
    expect(interactionTypeForExposure('render')).toBe('passive_read');
    expect(interactionTypeForExposure('hover')).toBe('course_hover_lookup');
    expect(interactionTypeForExposure('gloss')).toBe('course_gloss_lookup');
    expect(interactionTypeForExposure('swap_correct')).toBe('course_swap_correct');
    expect(interactionTypeForExposure('swap_incorrect')).toBe('course_swap_incorrect');
  });
});
