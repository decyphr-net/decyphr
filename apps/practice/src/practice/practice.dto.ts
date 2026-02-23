import { Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { EXERCISE_TYPES, ExerciseType } from './practice.types';

export class DuePracticeQueryDto {
  @IsOptional()
  @IsString()
  clientId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @IsOptional()
  @IsEnum(EXERCISE_TYPES)
  exerciseType?: ExerciseType;
}

export class SubmitPracticeAttemptDto {
  @IsEnum(EXERCISE_TYPES)
  exerciseType!: ExerciseType;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  phraseId!: number;

  @IsOptional()
  @IsString()
  userAnswer?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  userTokens?: string[];

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  latencyMs?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  hintsUsed?: number;
}

export class PracticeProgressQueryDto {
  @IsOptional()
  @IsString()
  clientId?: string;

  @IsOptional()
  @IsString()
  from?: string;

  @IsOptional()
  @IsString()
  to?: string;
}

export class PracticeHistoryQueryDto {
  @IsOptional()
  @IsString()
  clientId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number;
}

export class PracticeMistakesQueryDto {
  @IsOptional()
  @IsString()
  clientId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}

export class ResetProfilesDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  phraseId?: number;
}
