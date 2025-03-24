import { Type } from 'class-transformer';
import {
  IsArray,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';

/**
 * DTO representing the breakdown of a word translation.
 * Each breakdown contains details about the original word,
 * its translation, lemma, grammatical properties, and alternatives.
 */
export class BreakdownDto {
  /**
   * The unique identifier for the breakdown entry.
   * @example "1"
   */
  @IsNotEmpty({ message: 'Field `id` is required' })
  @IsString()
  id: string;

  /**
   * The original word in the source language.
   * @example "hello"
   */
  @IsNotEmpty({ message: 'Field `originalWord` is required' })
  @IsString()
  originalWord: string;

  /**
   * The translated word in the target language.
   * @example "hola"
   */
  @IsNotEmpty({ message: 'Field `translatedWord` is required' })
  @IsString()
  translatedWord: string;

  /**
   * The lemma (base form) of the original word.
   * @example "hello"
   */
  @IsNotEmpty({ message: 'Field `lemma` is required' })
  @IsString()
  lemma: string;

  /**
   * The CEFR level of the word.
   * @example "A1"
   */
  @IsNotEmpty({ message: 'Field `level` is required' })
  @IsString()
  level: string;

  /**
   * The part-of-speech tag for the word (e.g., verb, noun).
   * @example "verb"
   */
  @IsNotEmpty({ message: 'Field `pos_tag` is required' })
  @IsString()
  pos_tag: string;

  /**
   * A list of alternative translations for the word.
   * @example ["hi", "hey"]
   */
  @IsArray()
  @IsString({ each: true }) // Ensures each element is a string
  alternatives: string[];
}

/**
 * DTO representing the translation response containing language details,
 * translated text, grammatical tense, and word breakdown.
 */
export class TranslationResponseDto {
  /**
   * The detected language of the original text.
   * @example "en"
   */
  @IsNotEmpty({ message: 'Field `detectedLanguage` is required' })
  @IsString()
  detectedLanguage: string;

  /**
   * The translated text.
   * @example "Hola, mundo!"
   */
  @IsNotEmpty({ message: 'Field `translatedText` is required' })
  @IsString()
  translatedText: string;

  /**
   * The grammatical tense used in the translation.
   * @example "present"
   */
  @IsNotEmpty({ message: 'Field `tense` is required' })
  @IsString()
  tense: string;

  /**
   * A breakdown of the translated text into individual words,
   * each with its translation and other grammatical details.
   */
  @IsNotEmpty({ message: 'Field `breakdown` is required' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BreakdownDto)
  breakdown: BreakdownDto[];

  /**
   * An optional list of alternative translations for the full text.
   * @example ["hello world", "greetings, world"]
   */
  @IsOptional()
  @IsArray()
  alternatives: string[];
}

/**
 * DTO representing the payload containing a translated statement
 * with metadata like source, client ID, and translation response.
 */
export class TextTranslatedPayloadDto {
  /**
   * The statement or text that was translated.
   * @example "Hello, world!"
   */
  @IsNotEmpty({ message: 'Field `statement` is required' })
  @IsString()
  statement: string;

  /**
   * The language the statement was translated into.
   * @example "es"
   */
  @IsNotEmpty({ message: 'Field `language` is required' })
  @IsString()
  language: string;

  /**
   * The timestamp of when the translation event occurred.
   * @example 1616161616161
   */
  @IsNotEmpty({ message: 'Field `timestamp` is required' })
  @IsNumber()
  timestamp: string;

  /**
   * The source of the translation, e.g., "manual", "auto".
   * @example "manual"
   */
  @IsNotEmpty({ message: 'Field `source` is required' })
  @IsString()
  source: string;

  /**
   * The client ID associated with the translation request.
   * @example "client123"
   */
  @IsNotEmpty({ message: 'Field `clientId` is required' })
  @IsString()
  clientId: string;

  /**
   * The type of interaction that generated the translation (e.g., "active", "passive").
   * @example "active"
   */
  @IsNotEmpty({ message: 'Field `interactionType` is required' })
  @IsString()
  interactionType: string;

  /**
   * The detailed translation response.
   */
  @IsNotEmpty({ message: 'Field `translationResponse` is required' })
  @IsString()
  translationResponse: TranslationResponseDto;
}
