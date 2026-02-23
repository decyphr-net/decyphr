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
exports.PracticeAttempt = exports.PracticeProfile = void 0;
const typeorm_1 = require("typeorm");
let PracticeProfile = class PracticeProfile {
};
exports.PracticeProfile = PracticeProfile;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)({ type: 'bigint', unsigned: true }),
    __metadata("design:type", String)
], PracticeProfile.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 191 }),
    __metadata("design:type", String)
], PracticeProfile.prototype, "clientId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', unsigned: true }),
    __metadata("design:type", Number)
], PracticeProfile.prototype, "phraseId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'enum', enum: ['typed_translation', 'sentence_builder', 'cloze'] }),
    __metadata("design:type", String)
], PracticeProfile.prototype, "exerciseType", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'float', default: 2.5 }),
    __metadata("design:type", Number)
], PracticeProfile.prototype, "easeFactor", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', default: 0 }),
    __metadata("design:type", Number)
], PracticeProfile.prototype, "intervalDays", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', default: 0 }),
    __metadata("design:type", Number)
], PracticeProfile.prototype, "consecutiveCorrect", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', default: 0 }),
    __metadata("design:type", Number)
], PracticeProfile.prototype, "reviewCount", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', default: 0 }),
    __metadata("design:type", Number)
], PracticeProfile.prototype, "lapseCount", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'datetime', nullable: true }),
    __metadata("design:type", Object)
], PracticeProfile.prototype, "lastReviewedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'datetime' }),
    __metadata("design:type", Date)
], PracticeProfile.prototype, "dueAt", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], PracticeProfile.prototype, "createdAt", void 0);
exports.PracticeProfile = PracticeProfile = __decorate([
    (0, typeorm_1.Entity)('practice_profiles'),
    (0, typeorm_1.Index)('idx_practice_profiles_client_id', ['clientId']),
    (0, typeorm_1.Index)('idx_practice_profiles_due_at', ['dueAt']),
    (0, typeorm_1.Index)('idx_practice_profiles_phrase_type_unique', ['clientId', 'phraseId', 'exerciseType'], {
        unique: true,
    })
], PracticeProfile);
let PracticeAttempt = class PracticeAttempt {
};
exports.PracticeAttempt = PracticeAttempt;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)({ type: 'bigint', unsigned: true }),
    __metadata("design:type", String)
], PracticeAttempt.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 191 }),
    __metadata("design:type", String)
], PracticeAttempt.prototype, "clientId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', unsigned: true }),
    __metadata("design:type", Number)
], PracticeAttempt.prototype, "phraseId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'enum', enum: ['typed_translation', 'sentence_builder', 'cloze'] }),
    __metadata("design:type", String)
], PracticeAttempt.prototype, "exerciseType", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'bigint', unsigned: true, nullable: true }),
    __metadata("design:type", Object)
], PracticeAttempt.prototype, "profileId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => PracticeProfile, { onDelete: 'SET NULL', nullable: true }),
    (0, typeorm_1.JoinColumn)({ name: 'profileId' }),
    __metadata("design:type", Object)
], PracticeAttempt.prototype, "profile", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text' }),
    __metadata("design:type", String)
], PracticeAttempt.prototype, "promptText", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text' }),
    __metadata("design:type", String)
], PracticeAttempt.prototype, "expectedAnswer", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", Object)
], PracticeAttempt.prototype, "userAnswer", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'boolean', default: false }),
    __metadata("design:type", Boolean)
], PracticeAttempt.prototype, "isCorrect", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 5, scale: 2, default: 0 }),
    __metadata("design:type", String)
], PracticeAttempt.prototype, "score", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', nullable: true }),
    __metadata("design:type", Object)
], PracticeAttempt.prototype, "latencyMs", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', default: 0 }),
    __metadata("design:type", Number)
], PracticeAttempt.prototype, "hintsUsed", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'json', nullable: true }),
    __metadata("design:type", Object)
], PracticeAttempt.prototype, "metadataJson", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], PracticeAttempt.prototype, "createdAt", void 0);
exports.PracticeAttempt = PracticeAttempt = __decorate([
    (0, typeorm_1.Entity)('practice_attempts'),
    (0, typeorm_1.Index)('idx_practice_attempts_client_id', ['clientId']),
    (0, typeorm_1.Index)('idx_practice_attempts_created_at', ['createdAt']),
    (0, typeorm_1.Index)('idx_practice_attempts_phrase_id', ['phraseId'])
], PracticeAttempt);
//# sourceMappingURL=practice.entity.js.map