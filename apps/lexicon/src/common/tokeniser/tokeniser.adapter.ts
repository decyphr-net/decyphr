import { TokenWithMeta } from './adapters/types';

export interface TokeniserAdapter {
  /**
   * Normalise raw text (unicode normalization, optional fold accents, lowercase).
   */
  normalise(
    text: string,
    opts?: { foldDiacritics?: boolean; lowercase?: boolean }
  ): string;

  /**
   * Tokenise text to tokens with optional lemma/tag per-token.
   * language should be a BCP-47 code like 'en', 'es', etc.
   */
  tokenise(
    text: string,
    language?: string,
    opts?: { minLength?: number; removeStopwords?: boolean }
  ): Promise<TokenWithMeta[]>;

  getLemma?(token: string, meta?: TokenWithMeta): string | null;

  getPartOfSpeech?(token: string, meta?: TokenWithMeta): string | null;
}