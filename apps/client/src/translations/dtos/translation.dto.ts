import { IsNotEmpty, IsString } from 'class-validator';

/**
 * DTO representing a translation request, containing information about
 * the source and target languages, the text to be translated, and the client ID.
 */
export class TranslationDto {
  @IsString()
  requestId?: string;
  /**
   * The source language of the text to be translated.
   * @example "en"
   */
  @IsString()
  @IsNotEmpty()
  sourceLanguage: string;

  /**
   * The target language for the translation.
   * @example "es"
   */
  @IsString()
  @IsNotEmpty()
  targetLanguage: string;

  /**
   * The text that needs to be translated.
   * @example "Hello, world!"
   */
  @IsString()
  @IsNotEmpty()
  text: string;

  /**
   * The client ID associated with the translation request.
   * @example "client123"
   */
  @IsString()
  @IsNotEmpty()
  clientId: string;

  @IsString()
  statementId?: string;
}
