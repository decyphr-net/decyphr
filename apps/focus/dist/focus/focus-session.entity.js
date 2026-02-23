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
exports.FocusSession = void 0;
const typeorm_1 = require("typeorm");
const goal_entry_entity_1 = require("./goal-entry.entity");
let FocusSession = class FocusSession {
};
exports.FocusSession = FocusSession;
__decorate([
    (0, typeorm_1.PrimaryColumn)({ type: 'varchar', length: 64 }),
    __metadata("design:type", String)
], FocusSession.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', nullable: true }),
    __metadata("design:type", Object)
], FocusSession.prototype, "userId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 128 }),
    __metadata("design:type", String)
], FocusSession.prototype, "clientId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'enum', enum: ['time', 'goal'] }),
    __metadata("design:type", String)
], FocusSession.prototype, "mode", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: ['reading', 'course_material', 'listening', 'conversation', 'writing', 'review', 'other'],
        default: 'course_material',
    }),
    __metadata("design:type", String)
], FocusSession.prototype, "activityType", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", Object)
], FocusSession.prototype, "goalText", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', nullable: true }),
    __metadata("design:type", Object)
], FocusSession.prototype, "plannedSeconds", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', default: 0 }),
    __metadata("design:type", Number)
], FocusSession.prototype, "actualSeconds", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'enum', enum: ['running', 'paused', 'completed', 'cancelled'], default: 'running' }),
    __metadata("design:type", String)
], FocusSession.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'datetime' }),
    __metadata("design:type", Date)
], FocusSession.prototype, "startedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'datetime', nullable: true }),
    __metadata("design:type", Object)
], FocusSession.prototype, "endedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'datetime', nullable: true }),
    __metadata("design:type", Object)
], FocusSession.prototype, "pausedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', default: 0 }),
    __metadata("design:type", Number)
], FocusSession.prototype, "pauseAccumulatedSeconds", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'json', nullable: true }),
    __metadata("design:type", Object)
], FocusSession.prototype, "metadataJson", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => goal_entry_entity_1.GoalEntry, (entry) => entry.focusSession),
    __metadata("design:type", Array)
], FocusSession.prototype, "goalEntries", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], FocusSession.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], FocusSession.prototype, "updatedAt", void 0);
exports.FocusSession = FocusSession = __decorate([
    (0, typeorm_1.Entity)('focus_sessions'),
    (0, typeorm_1.Index)('idx_focus_client_status_started', ['clientId', 'status', 'startedAt']),
    (0, typeorm_1.Check)('CHK_focus_planned_seconds_nonneg', '`plannedSeconds` IS NULL OR `plannedSeconds` >= 0'),
    (0, typeorm_1.Check)('CHK_focus_actual_seconds_nonneg', '`actualSeconds` >= 0')
], FocusSession);
//# sourceMappingURL=focus-session.entity.js.map