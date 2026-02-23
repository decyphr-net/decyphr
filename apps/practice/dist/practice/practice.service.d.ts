import { Repository } from 'typeorm';
import { DuePracticeQueryDto, PracticeHistoryQueryDto, PracticeProgressQueryDto, ResetProfilesDto, SubmitPracticeAttemptDto } from './practice.dto';
import { PracticeAttempt, PracticeProfile } from './practice.entity';
export declare class PracticeService {
    private readonly profileRepo;
    private readonly attemptRepo;
    private readonly phrasebookUrl;
    constructor(profileRepo: Repository<PracticeProfile>, attemptRepo: Repository<PracticeAttempt>);
    private nextMidnight;
    private clamp;
    private parseResponse;
    private getPhrases;
    private sortedTokens;
    private isPunctuationToken;
    private pickMaskToken;
    private shuffle;
    private buildExercise;
    private normalize;
    private normalizeAscii;
    private levenshteinDistance;
    private typoThreshold;
    private scoreTypedOrCloze;
    private scoreSentenceBuilder;
    private toGrade;
    private computeSchedule;
    private ensureProfiles;
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
    submitAttempt(clientId: string, dto: SubmitPracticeAttemptDto): Promise<{
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
    private parseDate;
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
        data: PracticeAttempt[];
    }>;
    resetProfiles(clientId: string, dto: ResetProfilesDto): Promise<{
        ok: boolean;
        phraseId: number | null;
    }>;
}
