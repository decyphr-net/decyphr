import { z } from 'zod';

/**
 * Schema defining the structure of a word breakdown.
 *
 * This schema represents the details of an individual word's translation,
 * including its alternatives, part of speech, lemma, correctness, and level.
 */
const WordBreakdownSchema = z.object({
  /** The original word before translation. */
  originalWord: z.string(),

  /** The translated word in the target language. */
  translatedWord: z.string(),

  /** Alternative translations for the word. */
  alternatives: z.array(z.string()),

  /** The part-of-speech (POS) tag of the word (e.g., noun, verb). */
  pos_tag: z.string(),

  /** The base or root form of the word. */
  lemma: z.string(),

  /** A numerical value indicating the correctness of the translation (e.g., 0-1 scale). */
  correctness: z.number(),

  /** The proficiency level associated with the word (e.g., A1, B2). */
  level: z.string(),

  /** The corrected word if applicable (e.g., after grammar correction). */
  correctedWord: z.string(),
});

/**
 * Schema defining the structure of a translation output.
 *
 * This schema represents the full response of a translation operation,
 * including the detected language, translated text, alternatives, and word breakdown.
 */
export const TranslationOutputSchema = z.object({
  /** The detected source language of the input text. */
  detectedLanguage: z.string(),

  /** The translated text in the target language. */
  translatedText: z.string(),

  /** Alternative translations for the entire sentence or phrase. */
  alternatives: z.array(z.string()),

  /** A detailed breakdown of individual words and their translations. */
  breakdown: z.array(WordBreakdownSchema),

  /** The grammatical tense of the translated text (e.g., past, present). */
  tense: z.string(),
});

/**
 * Type representing the structured output of a translation.
 *
 * This type is inferred from `TranslationOutputSchema`, ensuring strong typing
 * when handling translation responses.
 */
export type TranslationOutput = z.infer<typeof TranslationOutputSchema>;

// export const TranslationSchema = z.object({
//   text: z.string(),
//   correctedText: z.string(),
//   translatedText: z.string(),
//   breakdown: z.string(), // or use z.object() if more structured
//   sourceLanguage: z.string(),
//   targetLanguage: z.string(),
// });
// export const WordBreakdownSchema = z.object({
//   originalWord: z.string(),
//   translatedWord: z.string(),
//   alternatives: z.array(z.string()),
//   pos_tag: z.string(),
//   lemma: z.string(),
//   correctness: z.number().min(0).max(1),
//   level: z.string(),
//   correctedWord: z.string(),
// });

// export const TranslationOutputSchema = z.object({
//   detectedLanguage: z.string(),
//   translatedText: z.string(),
//   alternatives: z.array(z.string()),
//   breakdown: z.array(WordBreakdownSchema),
//   tense: z.string(),
// });

// export type TranslationOutput = z.infer<typeof TranslationOutputSchema>;
