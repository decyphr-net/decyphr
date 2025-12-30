import { IsDate, IsString } from 'class-validator';

export class SaveTranslationResult {
  @IsString()
  id: string;

  @IsString()
  clientId: string;

  @IsString()
  originalText: string;

  @IsString()
  targetLanguage: string;

  @IsString()
  translated: string;

  @IsDate()
  createdAt: Date;
}
