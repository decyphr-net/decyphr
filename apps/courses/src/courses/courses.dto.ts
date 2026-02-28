import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

export class CourseMicroProgressUpdateDto {
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(24)
  completedChunkIds?: string[];

  @IsOptional()
  @IsString()
  lastChunkId?: string;
}

export class CourseProgressUpdateDto {
  @IsOptional()
  @IsString()
  lastBlockId?: string;

  @IsOptional()
  @IsBoolean()
  completed?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100)
  progressPercent?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  timeSpentDeltaSec?: number;

  @IsString()
  contentVersion!: string;

  @IsOptional()
  @IsObject()
  swapQuizState?: Record<string, unknown>;

  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => CourseMicroProgressUpdateDto)
  micro?: CourseMicroProgressUpdateDto;
}

const EXPOSURE_SOURCE = ['render', 'hover', 'gloss', 'swap_correct', 'swap_incorrect'] as const;

export class CourseLexiconExposureDto {
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(120)
  tokens!: string[];

  @IsEnum(EXPOSURE_SOURCE)
  source!: 'render' | 'hover' | 'gloss' | 'swap_correct' | 'swap_incorrect';

  @IsString()
  eventId!: string;

  @IsString()
  contentVersion!: string;
}

export class CourseGlossLookupDto {
  @IsString()
  @IsNotEmpty()
  token!: string;

  @IsOptional()
  @IsString()
  context?: string;

  @IsOptional()
  @IsString()
  blockId?: string;
}
