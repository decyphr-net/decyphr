import { DuePracticeQueryDto, PracticeHistoryQueryDto, PracticeProgressQueryDto, ResetProfilesDto, SubmitPracticeAttemptDto } from './practice.dto';
import { PracticeService } from './practice.service';
export declare class PracticeController {
    private readonly practiceService;
    constructor(practiceService: PracticeService);
    getDue(clientId: string, query: DuePracticeQueryDto): Promise<{
        totalDue: number;
        items: ({
            exerciseId: string;
            phraseId: number;
            exerciseType: "typed_translation" | "sentence_builder" | "cloze";
            prompt: string;
            tokens: string[] | undefined;
            maskedIndex: number | undefined;
            dueAt: Date;
            expectedAnswer: string;
        } | null)[];
    }>;
    submitAttempt(clientId: string, body: SubmitPracticeAttemptDto): Promise<{
        attemptId: string;
        isCorrect: boolean;
        score: number;
        normalizedExpected: string;
        nextDueAt: Date;
        profileStats: {
            easeFactor: number;
            intervalDays: number;
            reviewCount: number;
            lapseCount: number;
            consecutiveCorrect: number;
        };
    }>;
    getProgress(clientId: string, query: PracticeProgressQueryDto): Promise<{
        totalAttempts: number;
        totalCorrect: number;
        accuracy: number;
        dueCount: number;
        byType: {
            [k: string]: {
                accuracy: number;
                attempts: number;
                correct: number;
            };
        };
    }>;
    getHistory(clientId: string, query: PracticeHistoryQueryDto): Promise<{
        total: number;
        page: number;
        pageSize: number;
        data: import("./practice.entity").PracticeAttempt[];
    }>;
    resetProfiles(clientId: string, body: ResetProfilesDto): Promise<{
        ok: boolean;
        phraseId: number | null;
    }>;
}
