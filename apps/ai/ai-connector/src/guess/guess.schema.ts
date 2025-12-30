import { z } from 'zod';

const ConfidenceEnum = z.enum(['high', 'medium', 'low']);

export const VaultChunkSchema = z.object({
  original: z.string().min(1),
  meaning: z.string().min(1),
  user_understood: z.boolean(),
  confidence: ConfidenceEnum,
  reason: z.string().nullable(),
});

export const VaultMissingChunkSchema = z.object({
  original: z.string().min(1),
  meaning: z.string().min(1),
  reason: z.string().min(1),
});

export const VaultTranslationGuessSchema = z.object({
  overall: z.enum(['correct', 'partially_correct', 'incorrect']),
  chunks: z.array(VaultChunkSchema),
  missing_chunks: z.array(VaultMissingChunkSchema),
  notes: z.string().nullable(),
});

export type VaultTranslationGuess = z.infer<
  typeof VaultTranslationGuessSchema
>;