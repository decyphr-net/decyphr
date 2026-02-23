"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppDataSource = void 0;
const dotenv_1 = require("dotenv");
const typeorm_1 = require("typeorm");
const practice_entity_1 = require("./practice/practice.entity");
(0, dotenv_1.config)();
const host = process.env.DB_HOST || process.env.MARIA_DB_HOST || 'mariadb';
const port = Number(process.env.DB_PORT || process.env.MARIA_DB_PORT || 3306);
const username = process.env.DB_USER || process.env.MARIA_DB_USERNAME || 'root';
const password = process.env.DB_PASSWORD || process.env.MARIA_DB_PASSWORD || 'password';
const database = process.env.DB_NAME || process.env.MARIA_DB_DATABASE || 'decyphr';
exports.AppDataSource = new typeorm_1.DataSource({
    type: 'mariadb',
    host,
    port,
    username,
    password,
    database,
    synchronize: false,
    logging: false,
    entities: [practice_entity_1.PracticeProfile, practice_entity_1.PracticeAttempt],
    migrations: [__dirname + '/migrations/*{.js,.ts}'],
});
//# sourceMappingURL=data-source.js.map