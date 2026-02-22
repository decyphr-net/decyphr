"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InitialFlashcardsMigration1769520000000 = void 0;
class InitialFlashcardsMigration1769520000000 {
    constructor() {
        this.name = 'InitialFlashcardsMigration1769520000000';
    }
    async up(queryRunner) {
        await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS flashcard_packs (
        id INT NOT NULL AUTO_INCREMENT,
        clientId VARCHAR(191) NOT NULL,
        name VARCHAR(120) NOT NULL,
        description VARCHAR(500) NULL,
        language VARCHAR(12) NOT NULL DEFAULT 'ga',
        createdAt DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        updatedAt DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        PRIMARY KEY (id),
        INDEX idx_flashcard_packs_client_id (clientId)
      ) ENGINE=InnoDB
    `);
        await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS flashcards (
        id INT NOT NULL AUTO_INCREMENT,
        packId INT NOT NULL,
        front TEXT NOT NULL,
        back TEXT NOT NULL,
        pronunciation VARCHAR(255) NULL,
        notes VARCHAR(500) NULL,
        easeFactor FLOAT NOT NULL DEFAULT 2.5,
        intervalDays INT NOT NULL DEFAULT 0,
        consecutiveCorrect INT NOT NULL DEFAULT 0,
        reviewCount INT NOT NULL DEFAULT 0,
        lapseCount INT NOT NULL DEFAULT 0,
        lastReviewedAt DATETIME NULL,
        dueAt DATETIME NOT NULL,
        createdAt DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        updatedAt DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        PRIMARY KEY (id),
        INDEX idx_flashcards_pack_id (packId),
        INDEX idx_flashcards_due_at (dueAt),
        CONSTRAINT FK_flashcards_pack FOREIGN KEY (packId) REFERENCES flashcard_packs(id) ON DELETE CASCADE
      ) ENGINE=InnoDB
    `);
        await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS flashcard_attempts (
        id INT NOT NULL AUTO_INCREMENT,
        cardId INT NOT NULL,
        grade VARCHAR(16) NOT NULL,
        responseMs INT NULL,
        reviewedAt DATETIME NOT NULL,
        previousEaseFactor FLOAT NOT NULL,
        nextEaseFactor FLOAT NOT NULL,
        previousIntervalDays INT NOT NULL,
        nextIntervalDays INT NOT NULL,
        nextDueAt DATETIME NOT NULL,
        createdAt DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        PRIMARY KEY (id),
        INDEX idx_flashcard_attempts_card_id (cardId),
        INDEX idx_flashcard_attempts_created_at (createdAt),
        CONSTRAINT FK_flashcard_attempts_card FOREIGN KEY (cardId) REFERENCES flashcards(id) ON DELETE CASCADE
      ) ENGINE=InnoDB
    `);
    }
    async down(queryRunner) {
        await queryRunner.query('DROP TABLE IF EXISTS flashcard_attempts');
        await queryRunner.query('DROP TABLE IF EXISTS flashcards');
        await queryRunner.query('DROP TABLE IF EXISTS flashcard_packs');
    }
}
exports.InitialFlashcardsMigration1769520000000 = InitialFlashcardsMigration1769520000000;
//# sourceMappingURL=1769520000000-InitialFlashcardsMigration.js.map