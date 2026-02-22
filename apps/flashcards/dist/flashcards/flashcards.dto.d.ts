export declare class CreateFlashcardPackDto {
    name: string;
    description?: string;
    language?: string;
}
export declare class CreateFlashcardDto {
    front: string;
    back: string;
    pronunciation?: string;
    notes?: string;
    dueInDays?: number;
}
export declare class CreateFlashcardPackWithCardsDto extends CreateFlashcardPackDto {
    cards?: CreateFlashcardDto[];
}
export declare class RecordAttemptDto {
    grade: 'again' | 'hard' | 'good' | 'easy';
    responseMs?: number;
}
export declare class GetDueCardsQueryDto {
    packId?: number;
    limit?: number;
}
