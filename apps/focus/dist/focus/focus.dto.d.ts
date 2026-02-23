import { ActivityType, FocusMode, GoalPeriodType, GoalTargetType, GoalStatus } from './focus.types';
export declare class CreateFocusSessionDto {
    mode: FocusMode;
    activityType?: ActivityType;
    goalText?: string;
    plannedSeconds?: number;
    metadataJson?: Record<string, unknown>;
    userId?: number;
}
export declare class AdjustFocusSessionDto {
    plannedSeconds?: number;
    remainingSecondsDelta?: number;
}
export declare class CreateGoalDto {
    title: string;
    description?: string;
    periodType: GoalPeriodType;
    periodStart: string;
    periodEnd: string;
    targetType: GoalTargetType;
    targetValue: number;
    activityType?: ActivityType;
    status?: GoalStatus;
    userId?: number;
}
export declare class UpdateGoalDto {
    title?: string;
    description?: string;
    periodStart?: string;
    periodEnd?: string;
    targetValue?: number;
    status?: GoalStatus;
    activityType?: ActivityType;
}
export declare class GoalCheckoffDto {
    value?: number;
    note?: string;
    occurredAt?: string;
}
