import { ArrayNotEmpty, IsArray, IsNumber, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

import { PhrasebookTokenDto } from './phrasebook-token.dto';

export class PhrasebookTokensDto {
  @IsOptional()
  @IsString()
  requestId?: string;

  @IsOptional()
  @IsNumber()
  statementId?: number;

  @IsString()
  clientId!: string;

  @IsString()
  language!: string;

  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => PhrasebookTokenDto)
  tokens!: PhrasebookTokenDto[];
}
