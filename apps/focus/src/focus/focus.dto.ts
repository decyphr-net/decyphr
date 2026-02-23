import { IsEnum, IsInt, IsNotEmpty, IsNumber, IsObject, IsOptional, IsString, Min } from 'class-validator';
import { ActivityType, FocusMode, GoalPeriodType, GoalTargetType, GoalStatus } from './focus.types';

export class CreateFocusSessionDto {
  @IsEnum(['time', 'goal'])
  mode!: FocusMode;

  @IsOptional()
  @IsEnum(['reading', 'course_material', 'listening', 'conversation', 'writing', 'review', 'other'])
  activityType?: ActivityType;

  @IsOptional()
  @IsString()
  goalText?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  plannedSeconds?: number;

  @IsOptional()
  @IsObject()
  metadataJson?: Record<string, unknown>;

  @IsOptional()
  @IsInt()
  userId?: number;
}

export class AdjustFocusSessionDto {
  @IsOptional()
  @IsInt()
  @Min(0)
  plannedSeconds?: number;

  @IsOptional()
  @IsInt()
  remainingSecondsDelta?: number;
}

export class CreateGoalDto {
  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsEnum(['weekly', 'monthly', 'yearly', 'custom'])
  periodType!: GoalPeriodType;

  @IsString()
  periodStart!: string;

  @IsString()
  periodEnd!: string;

  @IsEnum(['time_minutes', 'session_count', 'unit_count'])
  targetType!: GoalTargetType;

  @IsNumber()
  @Min(0.01)
  targetValue!: number;

  @IsOptional()
  @IsEnum(['reading', 'course_material', 'listening', 'conversation', 'writing', 'review', 'other'])
  activityType?: ActivityType;

  @IsOptional()
  @IsEnum(['active', 'completed', 'archived'])
  status?: GoalStatus;

  @IsOptional()
  @IsInt()
  userId?: number;
}

export class UpdateGoalDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  periodStart?: string;

  @IsOptional()
  @IsString()
  periodEnd?: string;

  @IsOptional()
  @IsNumber()
  @Min(0.01)
  targetValue?: number;

  @IsOptional()
  @IsEnum(['active', 'completed', 'archived'])
  status?: GoalStatus;

  @IsOptional()
  @IsEnum(['reading', 'course_material', 'listening', 'conversation', 'writing', 'review', 'other'])
  activityType?: ActivityType;
}

export class GoalCheckoffDto {
  @IsOptional()
  @IsNumber()
  @Min(0.01)
  value?: number;

  @IsOptional()
  @IsString()
  note?: string;

  @IsOptional()
  @IsString()
  occurredAt?: string;
}
