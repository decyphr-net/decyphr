import { IsOptional, IsString } from 'class-validator';

export class StatementChangesDto {
  @IsString()
  text!: string;

  @IsOptional()
  @IsString()
  translation?: string;

  @IsOptional()
  @IsString()
  pronunciation?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
