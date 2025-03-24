// save-translation.dto.ts
import { IsArray, IsOptional, IsString } from 'class-validator';

/**
 * DTO for the translation data to be saved.
 */
export class SaveTranslationDto {
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
  @IsOptional()
  alternatives: string[];

  @IsArray()
  breakdown: {
    originalWord: string;
    translatedWord: string;
    alternatives: string[];
    pos_tag: string;
    lemma: string;
    correctness: number;
    level: string;
    correctedWord: string;
  }[];
}
