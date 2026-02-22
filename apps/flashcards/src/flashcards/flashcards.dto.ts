import { Type } from 'class-transformer';
import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsIn,
  IsNumber,
  Min,
  Max,
  ValidateNested,
  IsArray,
} from 'class-validator';

export class CreateFlashcardPackDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  language?: string;
}

export class CreateFlashcardDto {
  @IsString()
  @IsNotEmpty()
  front: string;

  @IsString()
  @IsNotEmpty()
  back: string;

  @IsOptional()
  @IsString()
  pronunciation?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(365)
  dueInDays?: number;
}

export class CreateFlashcardPackWithCardsDto extends CreateFlashcardPackDto {
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateFlashcardDto)
  cards?: CreateFlashcardDto[];
}

export class RecordAttemptDto {
  @IsIn(['again', 'hard', 'good', 'easy'])
  grade: 'again' | 'hard' | 'good' | 'easy';

  @IsOptional()
  @IsInt()
  @Min(0)
  responseMs?: number;
}

export class GetDueCardsQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  packId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  limit?: number;
}
