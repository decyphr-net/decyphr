"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var FlashcardsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.FlashcardsService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const crypto_1 = require("crypto");
const messaging_1 = require("@decyphr/messaging");
const flashcards_entity_1 = require("./flashcards.entity");
let FlashcardsService = FlashcardsService_1 = class FlashcardsService {
    constructor(packRepo, cardRepo, attemptRepo, kafkaProducer, statementEventProducer) {
        this.packRepo = packRepo;
        this.cardRepo = cardRepo;
        this.attemptRepo = attemptRepo;
        this.kafkaProducer = kafkaProducer;
        this.statementEventProducer = statementEventProducer;
        this.logger = new common_1.Logger(FlashcardsService_1.name);
    }
    clamp(value, min, max) {
        return Math.min(max, Math.max(min, value));
    }
    nextMidnight(daysFromNow) {
        const due = new Date();
        due.setHours(0, 0, 0, 0);
        due.setDate(due.getDate() + daysFromNow);
        return due;
    }
    computeSchedule(card, grade) {
        const previousEase = card.easeFactor || 2.5;
        const previousInterval = card.intervalDays || 0;
        const previousStreak = card.consecutiveCorrect || 0;
        let nextEase = previousEase;
        let nextInterval = previousInterval;
        let nextStreak = previousStreak;
        let lapseIncrement = 0;
        switch (grade) {
            case 'again':
                nextEase = this.clamp(previousEase - 0.2, 1.3, 3.0);
                nextInterval = 0;
                nextStreak = 0;
                lapseIncrement = 1;
                break;
            case 'hard':
                nextEase = this.clamp(previousEase - 0.15, 1.3, 3.0);
                nextInterval = Math.max(1, Math.round(previousInterval * 1.2));
                if (previousInterval === 0) {
                    nextInterval = 1;
                }
                nextStreak = previousStreak + 1;
                break;
            case 'good':
                nextEase = this.clamp(previousEase + 0.05, 1.3, 3.0);
                if (previousInterval <= 0) {
                    nextInterval = 1;
                }
                else if (previousInterval === 1) {
                    nextInterval = 3;
                }
                else {
                    nextInterval = Math.round(previousInterval * previousEase);
                }
                nextStreak = previousStreak + 1;
                break;
            case 'easy':
                nextEase = this.clamp(previousEase + 0.15, 1.3, 3.0);
                if (previousInterval <= 0) {
                    nextInterval = 3;
                }
                else {
                    nextInterval = Math.round(previousInterval * (previousEase + 0.35));
                }
                nextStreak = previousStreak + 1;
                break;
        }
        const dueAt = grade === 'again' ? new Date(Date.now() + 5 * 60 * 1000) : this.nextMidnight(nextInterval);
        return {
            previousEase,
            nextEase,
            previousInterval,
            nextInterval,
            nextStreak,
            lapseIncrement,
            dueAt,
        };
    }
    async emitFlashcardsEvent(payload) {
        await this.kafkaProducer.request(messaging_1.KafkaTopics.FLASHCARDS_EVENTS, {
            ...payload,
            timestamp: Date.now(),
        });
    }
    async emitLexiconInteractionFromAttempt(card, clientId, grade) {
        const isCorrect = grade === 'good' || grade === 'easy';
        const interactionType = isCorrect
            ? 'flashcard_guess_correct'
            : 'flashcard_guess_incorrect';
        await this.statementEventProducer.emitStatementEvent({
            requestId: (0, crypto_1.randomUUID)(),
            clientId,
            changes: {
                text: card.front,
                translation: card.back,
                pronunciation: card.pronunciation ?? undefined,
                notes: card.notes ?? undefined,
            },
            interaction: {
                type: interactionType,
                timestamp: Date.now(),
            },
            type: 'statement_updated',
            autoTranslate: false,
            timestamp: Date.now(),
            language: card.pack?.language ?? 'ga',
        });
    }
    async createPack(clientId, dto) {
        const pack = await this.packRepo.save(this.packRepo.create({
            clientId,
            name: dto.name,
            description: dto.description ?? null,
            language: dto.language ?? 'ga',
        }));
        await this.emitFlashcardsEvent({
            type: 'flashcards.pack.created',
            clientId,
            packId: pack.id,
        });
        return pack;
    }
    async createPackWithCards(clientId, dto) {
        const pack = await this.createPack(clientId, dto);
        if (dto.cards?.length) {
            const createdCards = dto.cards.map((card) => this.cardRepo.create({
                packId: pack.id,
                front: card.front,
                back: card.back,
                pronunciation: card.pronunciation ?? null,
                notes: card.notes ?? null,
                dueAt: this.nextMidnight(card.dueInDays ?? 0),
            }));
            await this.cardRepo.save(createdCards);
            await this.emitFlashcardsEvent({
                type: 'flashcards.cards.bulk_created',
                clientId,
                packId: pack.id,
            });
        }
        return this.getPack(clientId, pack.id);
    }
    async listPacks(clientId) {
        const packs = await this.packRepo.find({ where: { clientId } });
        const withStats = await Promise.all(packs.map(async (pack) => {
            const cardCount = await this.cardRepo.count({ where: { packId: pack.id } });
            const dueCount = await this.cardRepo
                .createQueryBuilder('card')
                .where('card.packId = :packId', { packId: pack.id })
                .andWhere('card.dueAt <= :now', { now: new Date() })
                .getCount();
            return {
                ...pack,
                cardCount,
                dueCount,
            };
        }));
        return withStats;
    }
    async getPack(clientId, packId) {
        const pack = await this.packRepo.findOne({
            where: { id: packId, clientId },
        });
        if (!pack) {
            throw new common_1.NotFoundException(`Pack ${packId} not found`);
        }
        const cards = await this.cardRepo.find({
            where: { packId: pack.id },
            order: { id: 'ASC' },
        });
        return {
            ...pack,
            cards,
        };
    }
    async createCard(clientId, packId, dto) {
        const pack = await this.packRepo.findOne({ where: { id: packId, clientId } });
        if (!pack) {
            throw new common_1.NotFoundException(`Pack ${packId} not found`);
        }
        const card = await this.cardRepo.save(this.cardRepo.create({
            packId,
            front: dto.front,
            back: dto.back,
            pronunciation: dto.pronunciation ?? null,
            notes: dto.notes ?? null,
            dueAt: this.nextMidnight(dto.dueInDays ?? 0),
        }));
        await this.emitFlashcardsEvent({
            type: 'flashcards.card.created',
            clientId,
            packId,
            cardId: card.id,
        });
        return card;
    }
    async getDueCards(clientId, query) {
        const qb = this.cardRepo
            .createQueryBuilder('card')
            .innerJoin(flashcards_entity_1.FlashcardPack, 'pack', 'pack.id = card.packId')
            .where('pack.clientId = :clientId', { clientId })
            .andWhere('card.dueAt <= :now', { now: new Date() })
            .orderBy('card.dueAt', 'ASC')
            .addOrderBy('card.id', 'ASC')
            .limit(query.limit ?? 20);
        if (query.packId) {
            qb.andWhere('card.packId = :packId', { packId: query.packId });
        }
        const cards = await qb.getMany();
        return cards;
    }
    async recordAttempt(clientId, cardId, dto) {
        const card = await this.cardRepo
            .createQueryBuilder('card')
            .innerJoinAndSelect('card.pack', 'pack')
            .where('card.id = :cardId', { cardId })
            .andWhere('pack.clientId = :clientId', { clientId })
            .getOne();
        if (!card) {
            throw new common_1.NotFoundException(`Card ${cardId} not found`);
        }
        const schedule = this.computeSchedule(card, dto.grade);
        card.easeFactor = schedule.nextEase;
        card.intervalDays = schedule.nextInterval;
        card.consecutiveCorrect = schedule.nextStreak;
        card.reviewCount = (card.reviewCount ?? 0) + 1;
        card.lapseCount = (card.lapseCount ?? 0) + schedule.lapseIncrement;
        card.lastReviewedAt = new Date();
        card.dueAt = schedule.dueAt;
        await this.cardRepo.save(card);
        const attempt = await this.attemptRepo.save(this.attemptRepo.create({
            cardId: card.id,
            grade: dto.grade,
            responseMs: dto.responseMs ?? null,
            reviewedAt: new Date(),
            previousEaseFactor: schedule.previousEase,
            nextEaseFactor: schedule.nextEase,
            previousIntervalDays: schedule.previousInterval,
            nextIntervalDays: schedule.nextInterval,
            nextDueAt: schedule.dueAt,
        }));
        const totalDue = await this.cardRepo
            .createQueryBuilder('due')
            .innerJoin(flashcards_entity_1.FlashcardPack, 'pack', 'pack.id = due.packId')
            .where('pack.clientId = :clientId', { clientId })
            .andWhere('due.dueAt <= :now', { now: new Date() })
            .getCount();
        await this.emitLexiconInteractionFromAttempt(card, clientId, dto.grade);
        await this.emitFlashcardsEvent({
            type: 'flashcards.card.attempted',
            clientId,
            packId: card.packId,
            cardId: card.id,
            attemptId: attempt.id,
            grade: dto.grade,
            dueAt: card.dueAt.toISOString(),
            totalDue,
        });
        return {
            cardId: card.id,
            grade: dto.grade,
            nextDueAt: card.dueAt,
            easeFactor: card.easeFactor,
            intervalDays: card.intervalDays,
            reviewCount: card.reviewCount,
            lapseCount: card.lapseCount,
            attemptId: attempt.id,
            totalDue,
        };
    }
    async handleCommand(command) {
        switch (command?.action) {
            case 'create_pack':
                return this.createPackWithCards(command.clientId, command.data);
            case 'create_card':
                return this.createCard(command.clientId, command.packId, command.data);
            case 'record_attempt':
                return this.recordAttempt(command.clientId, command.cardId, command.data);
            default:
                this.logger.warn(`Unsupported flashcards command: ${JSON.stringify(command)}`);
                return;
        }
    }
};
exports.FlashcardsService = FlashcardsService;
exports.FlashcardsService = FlashcardsService = FlashcardsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(flashcards_entity_1.FlashcardPack)),
    __param(1, (0, typeorm_1.InjectRepository)(flashcards_entity_1.Flashcard)),
    __param(2, (0, typeorm_1.InjectRepository)(flashcards_entity_1.FlashcardAttempt)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        messaging_1.KafkaProducer,
        messaging_1.StatementEventProducer])
], FlashcardsService);
//# sourceMappingURL=flashcards.service.js.map