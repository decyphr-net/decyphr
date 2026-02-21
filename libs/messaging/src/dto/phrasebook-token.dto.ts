import { IsNumber, IsOptional, IsString } from 'class-validator';

export class PhrasebookTokenDto {
  @IsNumber()
  position!: number;

  @IsString()
  surface!: string;

  @IsOptional()
  @IsString()
  lemma?: string;

  @IsOptional()
  @IsString()
  pos?: string;
}
