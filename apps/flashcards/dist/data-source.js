"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppDataSource = void 0;
const dotenv_1 = require("dotenv");
const typeorm_1 = require("typeorm");
const flashcards_entity_1 = require("./flashcards/flashcards.entity");
(0, dotenv_1.config)();
exports.AppDataSource = new typeorm_1.DataSource({
    type: 'mariadb',
    host: process.env.MARIA_DB_HOST,
    port: Number(process.env.MARIA_DB_PORT),
    username: process.env.MARIA_DB_USERNAME,
    password: process.env.MARIA_DB_PASSWORD,
    database: process.env.MARIA_DB_DATABASE,
    synchronize: false,
    logging: false,
    entities: [flashcards_entity_1.FlashcardPack, flashcards_entity_1.Flashcard, flashcards_entity_1.FlashcardAttempt],
    migrations: [__dirname + '/migrations/*{.js,.ts}'],
});
//# sourceMappingURL=data-source.js.map