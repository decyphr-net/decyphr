import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

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
}

const EXPOSURE_SOURCE = ['render', 'hover'] as const;

export class CourseLexiconExposureDto {
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(120)
  tokens!: string[];

  @IsEnum(EXPOSURE_SOURCE)
  source!: 'render' | 'hover';

  @IsString()
  eventId!: string;

  @IsString()
  contentVersion!: string;
}
