"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PracticeModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const practice_entity_1 = require("./practice.entity");
const practice_controller_1 = require("./practice.controller");
const practice_service_1 = require("./practice.service");
let PracticeModule = class PracticeModule {
};
exports.PracticeModule = PracticeModule;
exports.PracticeModule = PracticeModule = __decorate([
    (0, common_1.Module)({
        imports: [typeorm_1.TypeOrmModule.forFeature([practice_entity_1.PracticeProfile, practice_entity_1.PracticeAttempt])],
        controllers: [practice_controller_1.PracticeController],
        providers: [practice_service_1.PracticeService],
    })
], PracticeModule);
//# sourceMappingURL=practice.module.js.map