import {
  IsNotEmpty,
  IsNumber,
  IsString
} from 'class-validator';

/**
 * Represents the response containing the translation of a statement, including the detected language,
 * translated text.
 */
export class TranslationResponseDto {
  /**
   * The language in which the text was detected.
   * This field is required and must be a string.
   */
  @IsNotEmpty({ message: 'Field `sourceLanguage` is required' })
  @IsString()
  sourceLanguage: string;

  /**
   * The translated version of the statement.
   * This field is required and must be a string.
   */
  @IsNotEmpty({ message: 'Field `translated` is required' })
  @IsString()
  translated: string;

  /**
   * The tense of the translated statement (e.g., past, present, future).
   * This field is required and must be a string.
   */
  @IsNotEmpty({ message: 'Field `tense` is required' })
  @IsString()
  tense: string;
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
   * The translation response containing the translated text.
   * This field is required and must be a TranslationResponseDto object.
   */
  @IsNotEmpty({ message: 'Field `translationResponse` is required' })
  @IsString()
  translationResponse: TranslationResponseDto;
}
