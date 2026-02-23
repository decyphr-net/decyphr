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
exports.ResetProfilesDto = exports.PracticeHistoryQueryDto = exports.PracticeProgressQueryDto = exports.SubmitPracticeAttemptDto = exports.DuePracticeQueryDto = void 0;
const class_transformer_1 = require("class-transformer");
const class_validator_1 = require("class-validator");
const practice_types_1 = require("./practice.types");
class DuePracticeQueryDto {
}
exports.DuePracticeQueryDto = DuePracticeQueryDto;
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    (0, class_validator_1.Max)(100),
    __metadata("design:type", Number)
], DuePracticeQueryDto.prototype, "limit", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(practice_types_1.EXERCISE_TYPES),
    __metadata("design:type", String)
], DuePracticeQueryDto.prototype, "exerciseType", void 0);
class SubmitPracticeAttemptDto {
}
exports.SubmitPracticeAttemptDto = SubmitPracticeAttemptDto;
__decorate([
    (0, class_validator_1.IsEnum)(practice_types_1.EXERCISE_TYPES),
    __metadata("design:type", String)
], SubmitPracticeAttemptDto.prototype, "exerciseType", void 0);
__decorate([
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    __metadata("design:type", Number)
], SubmitPracticeAttemptDto.prototype, "phraseId", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], SubmitPracticeAttemptDto.prototype, "userAnswer", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.IsString)({ each: true }),
    __metadata("design:type", Array)
], SubmitPracticeAttemptDto.prototype, "userTokens", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], SubmitPracticeAttemptDto.prototype, "latencyMs", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], SubmitPracticeAttemptDto.prototype, "hintsUsed", void 0);
class PracticeProgressQueryDto {
}
exports.PracticeProgressQueryDto = PracticeProgressQueryDto;
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], PracticeProgressQueryDto.prototype, "from", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], PracticeProgressQueryDto.prototype, "to", void 0);
class PracticeHistoryQueryDto {
}
exports.PracticeHistoryQueryDto = PracticeHistoryQueryDto;
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    __metadata("design:type", Number)
], PracticeHistoryQueryDto.prototype, "page", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    (0, class_validator_1.Max)(100),
    __metadata("design:type", Number)
], PracticeHistoryQueryDto.prototype, "pageSize", void 0);
class ResetProfilesDto {
}
exports.ResetProfilesDto = ResetProfilesDto;
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], ResetProfilesDto.prototype, "phraseId", void 0);
//# sourceMappingURL=practice.dto.js.map