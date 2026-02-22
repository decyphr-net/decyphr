import { Repository } from 'typeorm';
import { KafkaProducer, StatementEventProducer } from '@decyphr/messaging';
import { CreateFlashcardDto, CreateFlashcardPackDto, CreateFlashcardPackWithCardsDto, GetDueCardsQueryDto, RecordAttemptDto } from './flashcards.dto';
import { Flashcard, FlashcardAttempt, FlashcardPack } from './flashcards.entity';
export declare class FlashcardsService {
    private readonly packRepo;
    private readonly cardRepo;
    private readonly attemptRepo;
    private readonly kafkaProducer;
    private readonly statementEventProducer;
    private readonly logger;
    constructor(packRepo: Repository<FlashcardPack>, cardRepo: Repository<Flashcard>, attemptRepo: Repository<FlashcardAttempt>, kafkaProducer: KafkaProducer, statementEventProducer: StatementEventProducer);
    private clamp;
    private nextMidnight;
    private computeSchedule;
    private emitFlashcardsEvent;
    private emitLexiconInteractionFromAttempt;
    createPack(clientId: string, dto: CreateFlashcardPackDto): Promise<FlashcardPack>;
    createPackWithCards(clientId: string, dto: CreateFlashcardPackWithCardsDto): Promise<{
        cards: Flashcard[];
        id: number;
        clientId: string;
        name: string;
        description?: string | null;
        language: string;
        createdAt: Date;
        updatedAt: Date;
    }>;
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
        cards: Flashcard[];
    }[]>;
    getPack(clientId: string, packId: number): Promise<{
        cards: Flashcard[];
        id: number;
        clientId: string;
        name: string;
        description?: string | null;
        language: string;
        createdAt: Date;
        updatedAt: Date;
    }>;
    createCard(clientId: string, packId: number, dto: CreateFlashcardDto): Promise<Flashcard>;
    getDueCards(clientId: string, query: GetDueCardsQueryDto): Promise<Flashcard[]>;
    recordAttempt(clientId: string, cardId: number, dto: RecordAttemptDto): Promise<{
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
    handleCommand(command: any): Promise<Flashcard | {
        cards: Flashcard[];
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
