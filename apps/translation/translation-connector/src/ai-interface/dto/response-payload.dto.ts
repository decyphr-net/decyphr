import {
  IsNotEmpty,
  IsNumber,
  IsString
} from 'class-validator';

/**
 * DTO representing the translation response containing language details,
 * translated text, grammatical tense.
 */
export class TranslationResponseDto {

  /**
   * The translated text.
   * @example "Hola, mundo!"
   */
  @IsNotEmpty({ message: 'Field `translated` is required' })
  @IsString()
  translated: string;

  /**
   * The grammatical tense used in the translation.
   * @example "present"
   */
  @IsNotEmpty({ message: 'Field `tense` is required' })
  @IsString()
  tense: string;
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
