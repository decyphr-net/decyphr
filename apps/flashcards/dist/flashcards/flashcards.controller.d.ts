import { CreateFlashcardDto, CreateFlashcardPackWithCardsDto, GetDueCardsQueryDto, RecordAttemptDto } from './flashcards.dto';
import { FlashcardsService } from './flashcards.service';
export declare class FlashcardsController {
    private readonly flashcardsService;
    constructor(flashcardsService: FlashcardsService);
    private extractKafkaValue;
    listPacks(clientId: string): Promise<{
        cardCount: number;
        dueCount: number;
        id: number;
        clientId: string;
        name: string;
        description?: string | null;
        language: string;
        createdAt: Date;
        updatedAt: Date;
        cards: import("./flashcards.entity").Flashcard[];
    }[]>;
    createPack(clientId: string, body: CreateFlashcardPackWithCardsDto): Promise<{
        cards: import("./flashcards.entity").Flashcard[];
        id: number;
        clientId: string;
        name: string;
        description?: string | null;
        language: string;
        createdAt: Date;
        updatedAt: Date;
    }>;
    getPack(clientId: string, packId: number): Promise<{
        cards: import("./flashcards.entity").Flashcard[];
        id: number;
        clientId: string;
        name: string;
        description?: string | null;
        language: string;
        createdAt: Date;
        updatedAt: Date;
    }>;
    createCard(clientId: string, packId: number, body: CreateFlashcardDto): Promise<import("./flashcards.entity").Flashcard>;
    getDueCards(clientId: string, query: GetDueCardsQueryDto): Promise<import("./flashcards.entity").Flashcard[]>;
    recordAttempt(clientId: string, cardId: number, body: RecordAttemptDto): Promise<{
        cardId: number;
        grade: "again" | "hard" | "good" | "easy";
        nextDueAt: Date;
        easeFactor: number;
        intervalDays: number;
        reviewCount: number;
        lapseCount: number;
        attemptId: number;
        totalDue: number;
    }>;
    handleCommand(payload: any): Promise<import("./flashcards.entity").Flashcard | {
        cards: import("./flashcards.entity").Flashcard[];
        id: number;
        clientId: string;
        name: string;
        description?: string | null;
        language: string;
        createdAt: Date;
        updatedAt: Date;
    } | {
        cardId: number;
        grade: "again" | "hard" | "good" | "easy";
        nextDueAt: Date;
        easeFactor: number;
        intervalDays: number;
        reviewCount: number;
        lapseCount: number;
        attemptId: number;
        totalDue: number;
    }>;
}
