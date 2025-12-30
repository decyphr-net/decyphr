import { IsOptional, IsString } from 'class-validator';

export class VaultEntryCreateDto {
  @IsString()
  userId: string;

  @IsString()
  sourceText: string;

  @IsString()
  targetLang: string;

  @IsString()
  translatedText: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
