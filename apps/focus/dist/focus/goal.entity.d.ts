import { GoalEntry } from './goal-entry.entity';
import { ActivityType, GoalPeriodType, GoalStatus, GoalTargetType } from './focus.types';
export declare class Goal {
    id: string;
    userId: number | null;
    clientId: string;
    title: string;
    description: string | null;
    periodType: GoalPeriodType;
    periodStart: Date;
    periodEnd: Date;
    targetType: GoalTargetType;
    targetValue: string;
    activityType: ActivityType | null;
    status: GoalStatus;
    entries: GoalEntry[];
    createdAt: Date;
    updatedAt: Date;
}
