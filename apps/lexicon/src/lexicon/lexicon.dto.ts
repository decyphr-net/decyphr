// lexicon.dto.ts
import { Type } from 'class-transformer';
import { IsArray, IsOptional, IsString, ValidateNested } from 'class-validator';

export class TokenDto {
  @IsString() surface!: string;
  @IsString() @IsOptional() lemma?: string;
  @IsString() normalised!: string;
  @IsString() pos!: string;
  @IsOptional() morph?: Record<string, any>;
}

export class SentenceDto {
  @IsString() sentenceId!: string;
  @IsString() text!: string;
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TokenDto)
  tokens!: TokenDto[];
}

export class NlpCompleteEventDto {
  @IsOptional() @IsString() requestId?: string;
  @IsString() clientId!: string;
  @IsString()
  language: string;
  @IsOptional() @IsString() timestamp?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SentenceDto)
  sentences!: SentenceDto[];
}
