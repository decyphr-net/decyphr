import { z } from 'zod';

/**
 * Schema defining the structure of a translation output.
 *
 * This schema represents the full response of a translation operation,
 * including the detected language and translated text.
 */
export const TranslationOutputSchema = z.object({
  /** The translated text in the target language. */
  translated: z.string(),
});

/**
 * Type representing the structured output of a translation.
 *
 * This type is inferred from `TranslationOutputSchema`, ensuring strong typing
 * when handling translation responses.
 */
export type TranslationOutput = z.infer<typeof TranslationOutputSchema>;

export const SimpleTranslationSchema = z.object({
  original: z.string(),
  translated: z.string(),
  sourceLang: z.string(),
  targetLang: z.string(),
});

export type SimpleTranslation = z.infer<typeof SimpleTranslationSchema>;