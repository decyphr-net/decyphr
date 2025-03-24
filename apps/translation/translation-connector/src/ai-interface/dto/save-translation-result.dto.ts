// save-translation-result.dto.ts

import { IsArray, IsDate, IsString } from 'class-validator';

export class SaveTranslationResult {
  @IsString()
  id: string;

  @IsString()
  clientId: string;

  @IsString()
  originalText: string;

  @IsString()
  detectedLanguage: string;

  @IsString()
  targetLanguage: string;

  @IsString()
  translatedText: string;

  @IsArray()
  alternatives: string[];

  @IsArray()
  breakdown: {
    id: string;
    originalWord: string;
    translatedWord: string;
    alternatives: string[];
    pos_tag: string;
    lemma: string;
    correctness: number;
    level: string;
    correctedWord: string;
  }[];

  @IsDate()
  createdAt: Date;
}
