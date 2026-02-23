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
exports.GoalCheckoffDto = exports.UpdateGoalDto = exports.CreateGoalDto = exports.AdjustFocusSessionDto = exports.CreateFocusSessionDto = void 0;
const class_validator_1 = require("class-validator");
class CreateFocusSessionDto {
}
exports.CreateFocusSessionDto = CreateFocusSessionDto;
__decorate([
    (0, class_validator_1.IsEnum)(['time', 'goal']),
    __metadata("design:type", String)
], CreateFocusSessionDto.prototype, "mode", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(['reading', 'course_material', 'listening', 'conversation', 'writing', 'review', 'other']),
    __metadata("design:type", String)
], CreateFocusSessionDto.prototype, "activityType", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateFocusSessionDto.prototype, "goalText", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], CreateFocusSessionDto.prototype, "plannedSeconds", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsObject)(),
    __metadata("design:type", Object)
], CreateFocusSessionDto.prototype, "metadataJson", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)(),
    __metadata("design:type", Number)
], CreateFocusSessionDto.prototype, "userId", void 0);
class AdjustFocusSessionDto {
}
exports.AdjustFocusSessionDto = AdjustFocusSessionDto;
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], AdjustFocusSessionDto.prototype, "plannedSeconds", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)(),
    __metadata("design:type", Number)
], AdjustFocusSessionDto.prototype, "remainingSecondsDelta", void 0);
class CreateGoalDto {
}
exports.CreateGoalDto = CreateGoalDto;
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], CreateGoalDto.prototype, "title", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateGoalDto.prototype, "description", void 0);
__decorate([
    (0, class_validator_1.IsEnum)(['weekly', 'monthly', 'yearly', 'custom']),
    __metadata("design:type", String)
], CreateGoalDto.prototype, "periodType", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateGoalDto.prototype, "periodStart", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateGoalDto.prototype, "periodEnd", void 0);
__decorate([
    (0, class_validator_1.IsEnum)(['time_minutes', 'session_count', 'unit_count']),
    __metadata("design:type", String)
], CreateGoalDto.prototype, "targetType", void 0);
__decorate([
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0.01),
    __metadata("design:type", Number)
], CreateGoalDto.prototype, "targetValue", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(['reading', 'course_material', 'listening', 'conversation', 'writing', 'review', 'other']),
    __metadata("design:type", String)
], CreateGoalDto.prototype, "activityType", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(['active', 'completed', 'archived']),
    __metadata("design:type", String)
], CreateGoalDto.prototype, "status", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)(),
    __metadata("design:type", Number)
], CreateGoalDto.prototype, "userId", void 0);
class UpdateGoalDto {
}
exports.UpdateGoalDto = UpdateGoalDto;
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], UpdateGoalDto.prototype, "title", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateGoalDto.prototype, "description", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateGoalDto.prototype, "periodStart", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateGoalDto.prototype, "periodEnd", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0.01),
    __metadata("design:type", Number)
], UpdateGoalDto.prototype, "targetValue", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(['active', 'completed', 'archived']),
    __metadata("design:type", String)
], UpdateGoalDto.prototype, "status", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(['reading', 'course_material', 'listening', 'conversation', 'writing', 'review', 'other']),
    __metadata("design:type", String)
], UpdateGoalDto.prototype, "activityType", void 0);
class GoalCheckoffDto {
}
exports.GoalCheckoffDto = GoalCheckoffDto;
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0.01),
    __metadata("design:type", Number)
], GoalCheckoffDto.prototype, "value", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], GoalCheckoffDto.prototype, "note", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], GoalCheckoffDto.prototype, "occurredAt", void 0);
//# sourceMappingURL=focus.dto.js.map