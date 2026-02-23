export declare class PracticeProfile {
    id: string;
    clientId: string;
    phraseId: number;
    exerciseType: 'typed_translation' | 'sentence_builder' | 'cloze';
    easeFactor: number;
    intervalDays: number;
    consecutiveCorrect: number;
    reviewCount: number;
    lapseCount: number;
    lastReviewedAt: Date | null;
    dueAt: Date;
    createdAt: Date;
}
export declare class PracticeAttempt {
    id: string;
    clientId: string;
    phraseId: number;
    exerciseType: 'typed_translation' | 'sentence_builder' | 'cloze';
    profileId: string | null;
    profile: PracticeProfile | null;
    promptText: string;
    expectedAnswer: string;
    userAnswer: string | null;
    isCorrect: boolean;
    score: string;
    latencyMs: number | null;
    hintsUsed: number;
    metadataJson: Record<string, unknown> | null;
    createdAt: Date;
}
