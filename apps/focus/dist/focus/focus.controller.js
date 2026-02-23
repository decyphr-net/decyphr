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
exports.FocusController = void 0;
const common_1 = require("@nestjs/common");
const focus_service_1 = require("./focus.service");
const focus_dto_1 = require("./focus.dto");
let FocusController = class FocusController {
    constructor(service) {
        this.service = service;
    }
    createSession(clientId, dto) {
        return this.service.createSession(clientId, dto);
    }
    getActive(clientId) {
        return this.service.getActiveSession(clientId);
    }
    pause(clientId, id) {
        return this.service.pauseSession(clientId, id);
    }
    resume(clientId, id) {
        return this.service.resumeSession(clientId, id);
    }
    adjust(clientId, id, dto) {
        return this.service.adjustSession(clientId, id, dto);
    }
    complete(clientId, id) {
        return this.service.completeSession(clientId, id);
    }
    cancel(clientId, id) {
        return this.service.cancelSession(clientId, id);
    }
    history(clientId, query) {
        return this.service.getHistory(clientId, query);
    }
    createGoal(clientId, dto) {
        return this.service.createGoal(clientId, dto);
    }
    listGoals(clientId, query) {
        return this.service.getGoals(clientId, query);
    }
    summary(clientId, query) {
        return this.service.getProgressSummary(clientId, query);
    }
    getGoal(clientId, id) {
        return this.service.getGoal(clientId, id);
    }
    patchGoal(clientId, id, dto) {
        return this.service.updateGoal(clientId, id, dto);
    }
    archiveGoal(clientId, id) {
        return this.service.archiveGoal(clientId, id);
    }
    checkoff(clientId, id, dto) {
        return this.service.checkoffGoal(clientId, id, dto);
    }
    goalProgress(clientId, id) {
        return this.service.getGoalProgress(clientId, id);
    }
};
exports.FocusController = FocusController;
__decorate([
    (0, common_1.Post)('/focus/sessions'),
    __param(0, (0, common_1.Query)('clientId')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, focus_dto_1.CreateFocusSessionDto]),
    __metadata("design:returntype", void 0)
], FocusController.prototype, "createSession", null);
__decorate([
    (0, common_1.Get)('/focus/sessions/active'),
    __param(0, (0, common_1.Query)('clientId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], FocusController.prototype, "getActive", null);
__decorate([
    (0, common_1.Post)('/focus/sessions/:id/pause'),
    __param(0, (0, common_1.Query)('clientId')),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], FocusController.prototype, "pause", null);
__decorate([
    (0, common_1.Post)('/focus/sessions/:id/resume'),
    __param(0, (0, common_1.Query)('clientId')),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], FocusController.prototype, "resume", null);
__decorate([
    (0, common_1.Post)('/focus/sessions/:id/adjust'),
    __param(0, (0, common_1.Query)('clientId')),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, focus_dto_1.AdjustFocusSessionDto]),
    __metadata("design:returntype", void 0)
], FocusController.prototype, "adjust", null);
__decorate([
    (0, common_1.Post)('/focus/sessions/:id/complete'),
    __param(0, (0, common_1.Query)('clientId')),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], FocusController.prototype, "complete", null);
__decorate([
    (0, common_1.Post)('/focus/sessions/:id/cancel'),
    __param(0, (0, common_1.Query)('clientId')),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], FocusController.prototype, "cancel", null);
__decorate([
    (0, common_1.Get)('/focus/sessions/history'),
    __param(0, (0, common_1.Query)('clientId')),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], FocusController.prototype, "history", null);
__decorate([
    (0, common_1.Post)('/goals'),
    __param(0, (0, common_1.Query)('clientId')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, focus_dto_1.CreateGoalDto]),
    __metadata("design:returntype", void 0)
], FocusController.prototype, "createGoal", null);
__decorate([
    (0, common_1.Get)('/goals'),
    __param(0, (0, common_1.Query)('clientId')),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], FocusController.prototype, "listGoals", null);
__decorate([
    (0, common_1.Get)('/goals/progress/summary'),
    __param(0, (0, common_1.Query)('clientId')),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], FocusController.prototype, "summary", null);
__decorate([
    (0, common_1.Get)('/goals/:id'),
    __param(0, (0, common_1.Query)('clientId')),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], FocusController.prototype, "getGoal", null);
__decorate([
    (0, common_1.Patch)('/goals/:id'),
    __param(0, (0, common_1.Query)('clientId')),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, focus_dto_1.UpdateGoalDto]),
    __metadata("design:returntype", void 0)
], FocusController.prototype, "patchGoal", null);
__decorate([
    (0, common_1.Post)('/goals/:id/archive'),
    __param(0, (0, common_1.Query)('clientId')),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], FocusController.prototype, "archiveGoal", null);
__decorate([
    (0, common_1.Post)('/goals/:id/checkoff'),
    __param(0, (0, common_1.Query)('clientId')),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, focus_dto_1.GoalCheckoffDto]),
    __metadata("design:returntype", void 0)
], FocusController.prototype, "checkoff", null);
__decorate([
    (0, common_1.Get)('/goals/:id/progress'),
    __param(0, (0, common_1.Query)('clientId')),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], FocusController.prototype, "goalProgress", null);
exports.FocusController = FocusController = __decorate([
    (0, common_1.Controller)(),
    __metadata("design:paramtypes", [focus_service_1.FocusService])
], FocusController);
//# sourceMappingURL=focus.controller.js.map