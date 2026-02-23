"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const typeorm_1 = require("@nestjs/typeorm");
const focus_module_1 = require("./focus/focus.module");
const focus_session_entity_1 = require("./focus/focus-session.entity");
const goal_entity_1 = require("./focus/goal.entity");
const goal_entry_entity_1 = require("./focus/goal-entry.entity");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule.forRoot(),
            typeorm_1.TypeOrmModule.forRoot({
                type: 'mariadb',
                host: process.env.DB_HOST || process.env.MARIA_DB_HOST || 'mariadb',
                port: Number(process.env.DB_PORT || process.env.MARIA_DB_PORT || 3306),
                username: process.env.DB_USER || process.env.MARIA_DB_USERNAME || 'root',
                password: process.env.DB_PASSWORD || process.env.MARIA_DB_PASSWORD || 'password',
                database: process.env.DB_NAME || process.env.MARIA_DB_DATABASE || 'decyphr',
                entities: [focus_session_entity_1.FocusSession, goal_entity_1.Goal, goal_entry_entity_1.GoalEntry],
                synchronize: true,
                logging: false,
            }),
            focus_module_1.FocusModule,
        ],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map