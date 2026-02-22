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
Object.defineProperty(exports, "__esModule", { value: true });
exports.FlashcardAttempt = exports.Flashcard = exports.FlashcardPack = void 0;
const typeorm_1 = require("typeorm");
let FlashcardPack = class FlashcardPack {
};
exports.FlashcardPack = FlashcardPack;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)(),
    __metadata("design:type", Number)
], FlashcardPack.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 191 }),
    __metadata("design:type", String)
], FlashcardPack.prototype, "clientId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 120 }),
    __metadata("design:type", String)
], FlashcardPack.prototype, "name", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 500, nullable: true }),
    __metadata("design:type", String)
], FlashcardPack.prototype, "description", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 12, default: 'ga' }),
    __metadata("design:type", String)
], FlashcardPack.prototype, "language", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], FlashcardPack.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], FlashcardPack.prototype, "updatedAt", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => Flashcard, (card) => card.pack, { cascade: false }),
    __metadata("design:type", Array)
], FlashcardPack.prototype, "cards", void 0);
exports.FlashcardPack = FlashcardPack = __decorate([
    (0, typeorm_1.Entity)('flashcard_packs'),
    (0, typeorm_1.Index)('idx_flashcard_packs_client_id', ['clientId'])
], FlashcardPack);
let Flashcard = class Flashcard {
};
exports.Flashcard = Flashcard;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)(),
    __metadata("design:type", Number)
], Flashcard.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int' }),
    __metadata("design:type", Number)
], Flashcard.prototype, "packId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => FlashcardPack, (pack) => pack.cards, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'packId' }),
    __metadata("design:type", FlashcardPack)
], Flashcard.prototype, "pack", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text' }),
    __metadata("design:type", String)
], Flashcard.prototype, "front", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text' }),
    __metadata("design:type", String)
], Flashcard.prototype, "back", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 255, nullable: true }),
    __metadata("design:type", String)
], Flashcard.prototype, "pronunciation", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 500, nullable: true }),
    __metadata("design:type", String)
], Flashcard.prototype, "notes", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'float', default: 2.5 }),
    __metadata("design:type", Number)
], Flashcard.prototype, "easeFactor", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', default: 0 }),
    __metadata("design:type", Number)
], Flashcard.prototype, "intervalDays", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', default: 0 }),
    __metadata("design:type", Number)
], Flashcard.prototype, "consecutiveCorrect", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', default: 0 }),
    __metadata("design:type", Number)
], Flashcard.prototype, "reviewCount", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', default: 0 }),
    __metadata("design:type", Number)
], Flashcard.prototype, "lapseCount", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'datetime', nullable: true }),
    __metadata("design:type", Date)
], Flashcard.prototype, "lastReviewedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'datetime' }),
    __metadata("design:type", Date)
], Flashcard.prototype, "dueAt", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], Flashcard.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], Flashcard.prototype, "updatedAt", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => FlashcardAttempt, (attempt) => attempt.card, { cascade: false }),
    __metadata("design:type", Array)
], Flashcard.prototype, "attempts", void 0);
exports.Flashcard = Flashcard = __decorate([
    (0, typeorm_1.Entity)('flashcards'),
    (0, typeorm_1.Index)('idx_flashcards_pack_id', ['packId']),
    (0, typeorm_1.Index)('idx_flashcards_due_at', ['dueAt'])
], Flashcard);
let FlashcardAttempt = class FlashcardAttempt {
};
exports.FlashcardAttempt = FlashcardAttempt;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)(),
    __metadata("design:type", Number)
], FlashcardAttempt.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int' }),
    __metadata("design:type", Number)
], FlashcardAttempt.prototype, "cardId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => Flashcard, (card) => card.attempts, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'cardId' }),
    __metadata("design:type", Flashcard)
], FlashcardAttempt.prototype, "card", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 16 }),
    __metadata("design:type", String)
], FlashcardAttempt.prototype, "grade", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', nullable: true }),
    __metadata("design:type", Number)
], FlashcardAttempt.prototype, "responseMs", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'datetime' }),
    __metadata("design:type", Date)
], FlashcardAttempt.prototype, "reviewedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'float' }),
    __metadata("design:type", Number)
], FlashcardAttempt.prototype, "previousEaseFactor", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'float' }),
    __metadata("design:type", Number)
], FlashcardAttempt.prototype, "nextEaseFactor", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int' }),
    __metadata("design:type", Number)
], FlashcardAttempt.prototype, "previousIntervalDays", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int' }),
    __metadata("design:type", Number)
], FlashcardAttempt.prototype, "nextIntervalDays", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'datetime' }),
    __metadata("design:type", Date)
], FlashcardAttempt.prototype, "nextDueAt", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], FlashcardAttempt.prototype, "createdAt", void 0);
exports.FlashcardAttempt = FlashcardAttempt = __decorate([
    (0, typeorm_1.Entity)('flashcard_attempts'),
    (0, typeorm_1.Index)('idx_flashcard_attempts_card_id', ['cardId']),
    (0, typeorm_1.Index)('idx_flashcard_attempts_created_at', ['createdAt'])
], FlashcardAttempt);
//# sourceMappingURL=flashcards.entity.js.map