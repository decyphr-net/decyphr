import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

/**
 * Data Transfer Object (DTO) for translation requests.
 *
 * This DTO defines the required structure for translating text, including
 * optional language parameters and a client identifier.
 */
export class TranslateDto {
  /**
   * The text to be translated.
   */
  @IsString()
  @IsNotEmpty()
  text: string;

  /**
   * The target language for translation (optional).
   * If not provided, the system may use a default target language.
   */
  @IsString()
  @IsOptional()
  targetLang: string;

  /**
   * The source language of the text (optional).
   * If not provided, the system may attempt to detect the language automatically.
   */
  @IsString()
  @IsOptional()
  sourceLang: string;

  /**
   * A unique identifier for the client making the request.
   * This ensures that the translation request is associated with a specific user or session.
   */
  @IsString()
  @IsNotEmpty()
  clientId: string;
}
