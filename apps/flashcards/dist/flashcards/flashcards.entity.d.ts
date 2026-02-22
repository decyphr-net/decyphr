export declare class FlashcardPack {
    id: number;
    clientId: string;
    name: string;
    description?: string | null;
    language: string;
    createdAt: Date;
    updatedAt: Date;
    cards: Flashcard[];
}
export declare class Flashcard {
    id: number;
    packId: number;
    pack: FlashcardPack;
    front: string;
    back: string;
    pronunciation?: string | null;
    notes?: string | null;
    easeFactor: number;
    intervalDays: number;
    consecutiveCorrect: number;
    reviewCount: number;
    lapseCount: number;
    lastReviewedAt?: Date | null;
    dueAt: Date;
    createdAt: Date;
    updatedAt: Date;
    attempts: FlashcardAttempt[];
}
export declare class FlashcardAttempt {
    id: number;
    cardId: number;
    card: Flashcard;
    grade: 'again' | 'hard' | 'good' | 'easy';
    responseMs?: number | null;
    reviewedAt: Date;
    previousEaseFactor: number;
    nextEaseFactor: number;
    previousIntervalDays: number;
    nextIntervalDays: number;
    nextDueAt: Date;
    createdAt: Date;
}
