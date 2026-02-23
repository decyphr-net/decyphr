import { ExerciseType } from './practice.types';
export declare class DuePracticeQueryDto {
    limit?: number;
    exerciseType?: ExerciseType;
}
export declare class SubmitPracticeAttemptDto {
    exerciseType: ExerciseType;
    phraseId: number;
    userAnswer?: string;
    userTokens?: string[];
    latencyMs?: number;
    hintsUsed?: number;
}
export declare class PracticeProgressQueryDto {
    from?: string;
    to?: string;
}
export declare class PracticeHistoryQueryDto {
    page?: number;
    pageSize?: number;
}
export declare class ResetProfilesDto {
    phraseId?: number;
}
