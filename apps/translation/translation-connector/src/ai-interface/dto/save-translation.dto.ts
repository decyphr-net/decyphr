// save-translation.dto.ts
import { IsNotEmpty, IsString } from 'class-validator';

/**
 * DTO for the translation data to be saved.
 */
export class SaveTranslationDto {

  @IsString()
  @IsNotEmpty()
  requestId: string;

  @IsString()
  clientId: string;

  @IsString()
  originalText: string;

  @IsString()
  targetLanguage: string;

  @IsString()
  translated: string;
}
