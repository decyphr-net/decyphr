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
Object.defineProperty(exports, "__esModule", { value: true });
exports.PracticeController = void 0;
const common_1 = require("@nestjs/common");
const practice_dto_1 = require("./practice.dto");
const practice_service_1 = require("./practice.service");
let PracticeController = class PracticeController {
    constructor(practiceService) {
        this.practiceService = practiceService;
    }
    getDue(clientId, query) {
        return this.practiceService.getDue(clientId, query);
    }
    submitAttempt(clientId, body) {
        return this.practiceService.submitAttempt(clientId, body);
    }
    getProgress(clientId, query) {
        return this.practiceService.getProgress(clientId, query);
    }
    getHistory(clientId, query) {
        return this.practiceService.getHistory(clientId, query);
    }
    resetProfiles(clientId, body) {
        return this.practiceService.resetProfiles(clientId, body);
    }
};
exports.PracticeController = PracticeController;
__decorate([
    (0, common_1.Get)('due'),
    __param(0, (0, common_1.Query)('clientId')),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, practice_dto_1.DuePracticeQueryDto]),
    __metadata("design:returntype", void 0)
], PracticeController.prototype, "getDue", null);
__decorate([
    (0, common_1.Post)('attempt'),
    __param(0, (0, common_1.Query)('clientId')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, practice_dto_1.SubmitPracticeAttemptDto]),
    __metadata("design:returntype", void 0)
], PracticeController.prototype, "submitAttempt", null);
__decorate([
    (0, common_1.Get)('progress'),
    __param(0, (0, common_1.Query)('clientId')),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, practice_dto_1.PracticeProgressQueryDto]),
    __metadata("design:returntype", void 0)
], PracticeController.prototype, "getProgress", null);
__decorate([
    (0, common_1.Get)('history'),
    __param(0, (0, common_1.Query)('clientId')),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, practice_dto_1.PracticeHistoryQueryDto]),
    __metadata("design:returntype", void 0)
], PracticeController.prototype, "getHistory", null);
__decorate([
    (0, common_1.Post)('profiles/reset'),
    __param(0, (0, common_1.Query)('clientId')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, practice_dto_1.ResetProfilesDto]),
    __metadata("design:returntype", void 0)
], PracticeController.prototype, "resetProfiles", null);
exports.PracticeController = PracticeController = __decorate([
    (0, common_1.Controller)('practice'),
    __metadata("design:paramtypes", [practice_service_1.PracticeService])
], PracticeController);
//# sourceMappingURL=practice.controller.js.map