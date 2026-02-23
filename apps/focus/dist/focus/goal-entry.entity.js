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
exports.GoalEntry = void 0;
const typeorm_1 = require("typeorm");
const focus_session_entity_1 = require("./focus-session.entity");
const goal_entity_1 = require("./goal.entity");
let GoalEntry = class GoalEntry {
};
exports.GoalEntry = GoalEntry;
__decorate([
    (0, typeorm_1.PrimaryColumn)({ type: 'varchar', length: 64 }),
    __metadata("design:type", String)
], GoalEntry.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 64 }),
    __metadata("design:type", String)
], GoalEntry.prototype, "goalId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => goal_entity_1.Goal, (goal) => goal.entries, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'goalId' }),
    __metadata("design:type", goal_entity_1.Goal)
], GoalEntry.prototype, "goal", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 128 }),
    __metadata("design:type", String)
], GoalEntry.prototype, "clientId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'enum', enum: ['focus_session', 'manual_checkoff'] }),
    __metadata("design:type", String)
], GoalEntry.prototype, "entryType", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 12, scale: 2, default: 1 }),
    __metadata("design:type", String)
], GoalEntry.prototype, "value", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", Object)
], GoalEntry.prototype, "note", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 64, nullable: true }),
    __metadata("design:type", Object)
], GoalEntry.prototype, "focusSessionId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => focus_session_entity_1.FocusSession, (session) => session.goalEntries, {
        onDelete: 'SET NULL',
        nullable: true,
    }),
    (0, typeorm_1.JoinColumn)({ name: 'focusSessionId' }),
    __metadata("design:type", Object)
], GoalEntry.prototype, "focusSession", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'datetime' }),
    __metadata("design:type", Date)
], GoalEntry.prototype, "occurredAt", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], GoalEntry.prototype, "createdAt", void 0);
exports.GoalEntry = GoalEntry = __decorate([
    (0, typeorm_1.Entity)('goal_entries'),
    (0, typeorm_1.Index)('idx_goal_entries_goal_occurred', ['goalId', 'occurredAt']),
    (0, typeorm_1.Check)('CHK_goal_entry_value_positive', '`value` > 0')
], GoalEntry);
//# sourceMappingURL=goal-entry.entity.js.map