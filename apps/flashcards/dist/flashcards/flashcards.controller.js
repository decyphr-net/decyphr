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
exports.FlashcardsController = void 0;
const common_1 = require("@nestjs/common");
const microservices_1 = require("@nestjs/microservices");
const messaging_1 = require("@decyphr/messaging");
const flashcards_dto_1 = require("./flashcards.dto");
const flashcards_service_1 = require("./flashcards.service");
let FlashcardsController = class FlashcardsController {
    constructor(flashcardsService) {
        this.flashcardsService = flashcardsService;
    }
    extractKafkaValue(payload) {
        let value = payload;
        if (typeof value === 'object' && value !== null && 'value' in value) {
            value = value.value;
        }
        if (typeof value === 'string') {
            try {
                value = JSON.parse(value);
            }
            catch {
                return null;
            }
        }
        if (typeof value === 'object' && value !== null && 'value' in value) {
            const nested = value.value;
            if (typeof nested === 'string') {
                try {
                    value = JSON.parse(nested);
                }
                catch {
                    return null;
                }
            }
            else if (nested != null) {
                value = nested;
            }
        }
        return value;
    }
    listPacks(clientId) {
        return this.flashcardsService.listPacks(clientId);
    }
    createPack(clientId, body) {
        return this.flashcardsService.createPackWithCards(clientId, body);
    }
    getPack(clientId, packId) {
        return this.flashcardsService.getPack(clientId, packId);
    }
    createCard(clientId, packId, body) {
        return this.flashcardsService.createCard(clientId, packId, body);
    }
    getDueCards(clientId, query) {
        return this.flashcardsService.getDueCards(clientId, query);
    }
    recordAttempt(clientId, cardId, body) {
        return this.flashcardsService.recordAttempt(clientId, cardId, body);
    }
    async handleCommand(payload) {
        const value = this.extractKafkaValue(payload);
        if (!value) {
            return;
        }
        return this.flashcardsService.handleCommand(value);
    }
};
exports.FlashcardsController = FlashcardsController;
__decorate([
    (0, common_1.Get)('packs'),
    __param(0, (0, common_1.Query)('clientId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], FlashcardsController.prototype, "listPacks", null);
__decorate([
    (0, common_1.Post)('packs'),
    __param(0, (0, common_1.Query)('clientId')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, flashcards_dto_1.CreateFlashcardPackWithCardsDto]),
    __metadata("design:returntype", void 0)
], FlashcardsController.prototype, "createPack", null);
__decorate([
    (0, common_1.Get)('packs/:packId'),
    __param(0, (0, common_1.Query)('clientId')),
    __param(1, (0, common_1.Param)('packId', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Number]),
    __metadata("design:returntype", void 0)
], FlashcardsController.prototype, "getPack", null);
__decorate([
    (0, common_1.Post)('packs/:packId/cards'),
    __param(0, (0, common_1.Query)('clientId')),
    __param(1, (0, common_1.Param)('packId', common_1.ParseIntPipe)),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Number, flashcards_dto_1.CreateFlashcardDto]),
    __metadata("design:returntype", void 0)
], FlashcardsController.prototype, "createCard", null);
__decorate([
    (0, common_1.Get)('study/due'),
    __param(0, (0, common_1.Query)('clientId')),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, flashcards_dto_1.GetDueCardsQueryDto]),
    __metadata("design:returntype", void 0)
], FlashcardsController.prototype, "getDueCards", null);
__decorate([
    (0, common_1.Post)('cards/:cardId/attempt'),
    __param(0, (0, common_1.Query)('clientId')),
    __param(1, (0, common_1.Param)('cardId', common_1.ParseIntPipe)),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Number, flashcards_dto_1.RecordAttemptDto]),
    __metadata("design:returntype", void 0)
], FlashcardsController.prototype, "recordAttempt", null);
__decorate([
    (0, microservices_1.EventPattern)(messaging_1.KafkaTopics.FLASHCARDS_COMMANDS),
    __param(0, (0, microservices_1.Payload)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], FlashcardsController.prototype, "handleCommand", null);
exports.FlashcardsController = FlashcardsController = __decorate([
    (0, common_1.Controller)(),
    __metadata("design:paramtypes", [flashcards_service_1.FlashcardsService])
], FlashcardsController);
//# sourceMappingURL=flashcards.controller.js.map