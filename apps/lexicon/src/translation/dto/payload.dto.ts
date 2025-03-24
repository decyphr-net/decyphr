import { Type } from 'class-transformer';
import {
  IsArray,
  IsNotEmpty,
  IsNumber,
  IsString,
  ValidateNested,
} from 'class-validator';

/**
 * Represents a breakdown of a translated word, containing details such as its original form, lemma,
 * part-of-speech tag, and possible alternatives.
 */
export class BreakdownDto {
  /**
   * Unique identifier for the breakdown entry.
   * This field is required and must be a string.
   */
  @IsNotEmpty({ message: 'Field `id` is required' })
  @IsString()
  id: string;

  /**
   * The original word before translation.
   * This field is required and must be a string.
   */
  @IsNotEmpty({ message: 'Field `originalWord` is required' })
  @IsString()
  originalWord: string;

  /**
   * The translated form of the original word.
   * This field is required and must be a string.
   */
  @IsNotEmpty({ message: 'Field `translatedWord` is required' })
  @IsString()
  translatedWord: string;

  /**
   * The lemma of the word (the base form).
   * This field is required and must be a string.
   */
  @IsNotEmpty({ message: 'Field `lemma` is required' })
  @IsString()
  lemma: string;

  /**
   * The level of difficulty or classification of the word.
   * This field is required and must be a string.
   */
  @IsNotEmpty({ message: 'Field `level` is required' })
  @IsString()
  level: string;

  /**
   * The part-of-speech (POS) tag associated with the word.
   * This field is required and must be a string.
   */
  @IsNotEmpty({ message: 'Field `pos_tag` is required' })
  @IsString()
  pos_tag: string;

  /**
   * A list of alternative translations or words related to the original word.
   * This field is required and must be an array of strings.
   */
  @IsArray()
  @IsString({ each: true }) // Ensures each element is a string
  alternatives: string[];
}

/**
 * Represents the response containing the translation of a statement, including the detected language,
 * translated text, and a breakdown of the translated words.
 */
export class TranslationResponseDto {
  /**
   * The language in which the text was detected.
   * This field is required and must be a string.
   */
  @IsNotEmpty({ message: 'Field `detectedLanguage` is required' })
  @IsString()
  detectedLanguage: string;

  /**
   * The translated version of the statement.
   * This field is required and must be a string.
   */
  @IsNotEmpty({ message: 'Field `translatedText` is required' })
  @IsString()
  translatedText: string;

  /**
   * The tense of the translated statement (e.g., past, present, future).
   * This field is required and must be a string.
   */
  @IsNotEmpty({ message: 'Field `tense` is required' })
  @IsString()
  tense: string;

  /**
   * A list of breakdowns for each word in the translated statement.
   * This field is required and must be an array of BreakdownDto objects.
   */
  @IsNotEmpty({ message: 'Field `breakdown` is required' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BreakdownDto)
  breakdown: BreakdownDto[];
}

/**
 * Represents the payload received when a text is translated, including the original statement,
 * translation details, and metadata.
 */
export class TextTranslatedPayloadDto {
  /**
   * The original statement that was translated.
   * This field is required and must be a string.
   */
  @IsNotEmpty({ message: 'Field `statement` is required' })
  @IsString()
  statement: string;

  /**
   * The language in which the statement was originally written.
   * This field is required and must be a string.
   */
  @IsNotEmpty({ message: 'Field `language` is required' })
  @IsString()
  language: string;

  /**
   * The timestamp indicating when the statement was translated.
   * This field is required and must be a number (as a string).
   */
  @IsNotEmpty({ message: 'Field `timestamp` is required' })
  @IsNumber()
  timestamp: string;

  /**
   * The source from which the statement originated (e.g., system, user input).
   * This field is required and must be a string.
   */
  @IsNotEmpty({ message: 'Field `source` is required' })
  @IsString()
  source: string;

  /**
   * The unique client identifier associated with the translation request.
   * This field is required and must be a string.
   */
  @IsNotEmpty({ message: 'Field `clientId` is required' })
  @IsString()
  clientId: string;

  /**
   * The type of interaction associated with the translation request (e.g., active, passive).
   * This field is required and must be a string.
   */
  @IsNotEmpty({ message: 'Field `interactionType` is required' })
  @IsString()
  interactionType: string;

  /**
   * The translation response containing the translated text and its breakdown.
   * This field is required and must be a TranslationResponseDto object.
   */
  @IsNotEmpty({ message: 'Field `translationResponse` is required' })
  @IsString()
  translationResponse: TranslationResponseDto;
}
