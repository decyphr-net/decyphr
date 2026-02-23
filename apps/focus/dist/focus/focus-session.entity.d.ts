import { GoalEntry } from './goal-entry.entity';
import { ActivityType, FocusMode, FocusStatus } from './focus.types';
export declare class FocusSession {
    id: string;
    userId: number | null;
    clientId: string;
    mode: FocusMode;
    activityType: ActivityType;
    goalText: string | null;
    plannedSeconds: number | null;
    actualSeconds: number;
    status: FocusStatus;
    startedAt: Date;
    endedAt: Date | null;
    pausedAt: Date | null;
    pauseAccumulatedSeconds: number;
    metadataJson: Record<string, unknown> | null;
    goalEntries: GoalEntry[];
    createdAt: Date;
    updatedAt: Date;
}
