import { IsNotEmpty, IsNumber, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

import { InteractionMetadata } from './interaction-metadata.dto';

export class TranslationDto {
  @IsString()
  @IsNotEmpty()
  requestId: string;

  @IsString()
  @IsNotEmpty()
  sourceLanguage: string;

  @IsString()
  @IsNotEmpty()
  targetLanguage: string;

  @IsString()
  @IsNotEmpty()
  text: string;

  @IsString()
  @IsNotEmpty()
  clientId: string;

  @ValidateNested()
  @Type(() => InteractionMetadata)
  interaction: InteractionMetadata;

  @IsNumber()
  statementId?: number;
}