import { IsBoolean, IsIn, IsNotEmpty, IsNumber, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

import { InteractionMetadata } from './interaction-metadata.dto';
import { StatementChangesDto } from './statement-changes.dto';

export class StatementEventDto {
  @IsOptional()
  @IsString()
  statementId?: string;

  @IsOptional()
  @IsString()
  requestId?: string;

  @IsString()
  @IsNotEmpty()
  clientId!: string;

  @ValidateNested()
  @Type(() => StatementChangesDto)
  changes!: StatementChangesDto;

  @ValidateNested()
  @Type(() => InteractionMetadata)
  interaction!: InteractionMetadata;

  @IsIn(['statement_created', 'statement_updated'])
  type!: 'statement_created' | 'statement_updated';

  @IsBoolean()
  autoTranslate!: boolean;

  @IsNumber()
  timestamp!: number;

  @IsString()
  language!: string;
}
