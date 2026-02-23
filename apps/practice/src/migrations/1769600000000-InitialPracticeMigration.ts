import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialPracticeMigration1769600000000 implements MigrationInterface {
  name = 'InitialPracticeMigration1769600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      "CREATE TABLE `practice_profiles` (`id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, `clientId` varchar(191) NOT NULL, `phraseId` int UNSIGNED NOT NULL, `exerciseType` enum ('typed_translation', 'sentence_builder', 'cloze') NOT NULL, `easeFactor` float NOT NULL DEFAULT '2.5', `intervalDays` int NOT NULL DEFAULT '0', `consecutiveCorrect` int NOT NULL DEFAULT '0', `reviewCount` int NOT NULL DEFAULT '0', `lapseCount` int NOT NULL DEFAULT '0', `lastReviewedAt` datetime NULL, `dueAt` datetime NOT NULL, `createdAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), INDEX `idx_practice_profiles_client_id` (`clientId`), INDEX `idx_practice_profiles_due_at` (`dueAt`), UNIQUE INDEX `idx_practice_profiles_phrase_type_unique` (`clientId`, `phraseId`, `exerciseType`), PRIMARY KEY (`id`)) ENGINE=InnoDB",
    );

    await queryRunner.query(
      "CREATE TABLE `practice_attempts` (`id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, `clientId` varchar(191) NOT NULL, `phraseId` int UNSIGNED NOT NULL, `exerciseType` enum ('typed_translation', 'sentence_builder', 'cloze') NOT NULL, `profileId` bigint UNSIGNED NULL, `promptText` text NOT NULL, `expectedAnswer` text NOT NULL, `userAnswer` text NULL, `isCorrect` tinyint NOT NULL DEFAULT 0, `score` decimal(5,2) NOT NULL DEFAULT '0.00', `latencyMs` int NULL, `hintsUsed` int NOT NULL DEFAULT '0', `metadataJson` json NULL, `createdAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), INDEX `idx_practice_attempts_client_id` (`clientId`), INDEX `idx_practice_attempts_created_at` (`createdAt`), INDEX `idx_practice_attempts_phrase_id` (`phraseId`), PRIMARY KEY (`id`)) ENGINE=InnoDB",
    );

    await queryRunner.query(
      'ALTER TABLE `practice_attempts` ADD CONSTRAINT `FK_practice_attempts_profile` FOREIGN KEY (`profileId`) REFERENCES `practice_profiles`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE `practice_attempts` DROP FOREIGN KEY `FK_practice_attempts_profile`',
    );
    await queryRunner.query('DROP TABLE `practice_attempts`');
    await queryRunner.query('DROP TABLE `practice_profiles`');
  }
}
