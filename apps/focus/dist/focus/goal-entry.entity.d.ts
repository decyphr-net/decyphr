import { FocusSession } from './focus-session.entity';
import { Goal } from './goal.entity';
import { GoalEntryType } from './focus.types';
export declare class GoalEntry {
    id: string;
    goalId: string;
    goal: Goal;
    clientId: string;
    entryType: GoalEntryType;
    value: string;
    note: string | null;
    focusSessionId: string | null;
    focusSession: FocusSession | null;
    occurredAt: Date;
    createdAt: Date;
}
