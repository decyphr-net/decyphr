import {
  IsString,
  IsOptional,
  IsArray,
  ValidateNested,
  IsNumber,
  IsBoolean,
} from 'class-validator';
import { Type } from 'class-transformer';

// A token in a phrase
export class PhraseTokenDto {
  @IsNumber()
  position: number;

  @IsString()
  surface: string;

  @IsString()
  lemma: string;

  @IsString()
  pos: string;
}

// Data needed to create or update a phrase
export class UpdatePhraseDto {
  @IsString()
  text: string;

  @IsOptional()
  @IsBoolean()
  autoTranslation?: boolean;

  @IsOptional()
  @IsString()
  translation?: string;

  @IsOptional()
  @IsString()
  pronunciation?: string;

  @IsOptional()
  @IsString()
  example?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PhraseTokenDto)
  tokens?: PhraseTokenDto[];
}

// Response DTO for a phrase
export class PhrasebookStatementDto {
  id: number;
  text: string;
  autoTranslation?: boolean;
  translation?: string | null;
  pronunciation?: string | null;
  example?: string | null;
  notes?: string | null;
  tokens?: PhraseTokenDto[];
}
