// lexicon.dto.ts
import { Type } from 'class-transformer';
import {
  IsArray,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  ValidateIf,
  ValidateNested,
} from 'class-validator';

export class TokenDto {
  @IsString() surface!: string;
  @IsString() @IsOptional() lemma?: string;
  @IsOptional() @IsString() normalised?: string;
  @IsString() pos!: string;
  @IsOptional() morph?: Record<string, any>;
}

export class SentenceDto {
  @IsOptional() @IsString() sentenceId?: string;
  @IsString() text!: string;
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TokenDto)
  tokens!: TokenDto[];
}

export class InteractionMetadataDto {
  @IsString() type!: string;
  @IsOptional()
  @ValidateIf((_, value) => typeof value === 'string')
  @IsString()
  @ValidateIf((_, value) => Number.isInteger(value))
  @IsInt()
  timestamp?: string | number;
}

export class StatementChangesDto {
  @IsOptional() @IsString() meaning?: string;
  @IsOptional() @IsString() pronunciation?: string;
  @IsOptional() @IsString() notes?: string;
  @IsOptional() @IsString() translation?: string;
}

export class NlpCompleteEventDto {
  @IsOptional() @IsString() requestId?: string;
  @IsOptional() @IsNumber() statementId?: number;
  @IsString() clientId!: string;
  @IsString()
  language: string;
  @IsOptional() @IsString() timestamp?: string;
  @IsOptional()
  @ValidateNested()
  @Type(() => InteractionMetadataDto)
  interaction?: InteractionMetadataDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => StatementChangesDto)
  changes?: StatementChangesDto;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SentenceDto)
  sentences!: SentenceDto[];
}
