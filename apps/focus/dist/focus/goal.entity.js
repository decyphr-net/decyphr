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
exports.Goal = void 0;
const typeorm_1 = require("typeorm");
const goal_entry_entity_1 = require("./goal-entry.entity");
let Goal = class Goal {
};
exports.Goal = Goal;
__decorate([
    (0, typeorm_1.PrimaryColumn)({ type: 'varchar', length: 64 }),
    __metadata("design:type", String)
], Goal.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', nullable: true }),
    __metadata("design:type", Object)
], Goal.prototype, "userId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 128 }),
    __metadata("design:type", String)
], Goal.prototype, "clientId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 255 }),
    __metadata("design:type", String)
], Goal.prototype, "title", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", Object)
], Goal.prototype, "description", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'enum', enum: ['weekly', 'monthly', 'yearly', 'custom'] }),
    __metadata("design:type", String)
], Goal.prototype, "periodType", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'datetime' }),
    __metadata("design:type", Date)
], Goal.prototype, "periodStart", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'datetime' }),
    __metadata("design:type", Date)
], Goal.prototype, "periodEnd", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'enum', enum: ['time_minutes', 'session_count', 'unit_count'] }),
    __metadata("design:type", String)
], Goal.prototype, "targetType", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 12, scale: 2 }),
    __metadata("design:type", String)
], Goal.prototype, "targetValue", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: ['reading', 'course_material', 'listening', 'conversation', 'writing', 'review', 'other'],
        nullable: true,
    }),
    __metadata("design:type", Object)
], Goal.prototype, "activityType", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'enum', enum: ['active', 'completed', 'archived'], default: 'active' }),
    __metadata("design:type", String)
], Goal.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => goal_entry_entity_1.GoalEntry, (entry) => entry.goal),
    __metadata("design:type", Array)
], Goal.prototype, "entries", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], Goal.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], Goal.prototype, "updatedAt", void 0);
exports.Goal = Goal = __decorate([
    (0, typeorm_1.Entity)('goals'),
    (0, typeorm_1.Index)('idx_goals_client_status_period', ['clientId', 'status', 'periodStart', 'periodEnd']),
    (0, typeorm_1.Check)('CHK_goal_period', '`periodStart` < `periodEnd`'),
    (0, typeorm_1.Check)('CHK_goal_target_positive', '`targetValue` > 0')
], Goal);
//# sourceMappingURL=goal.entity.js.map