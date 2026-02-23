import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialCoursesMigration1769800000000 implements MigrationInterface {
  name = 'InitialCoursesMigration1769800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      "CREATE TABLE `course_progress` (`id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, `clientId` varchar(191) NOT NULL, `courseSlug` varchar(128) NOT NULL, `lessonSlug` varchar(128) NOT NULL, `contentVersion` varchar(64) NOT NULL, `status` enum ('not_started', 'in_progress', 'completed') NOT NULL DEFAULT 'not_started', `progressPercent` int NOT NULL DEFAULT '0', `lastBlockId` varchar(128) NULL, `timeSpentSec` int UNSIGNED NOT NULL DEFAULT '0', `startedAt` datetime NULL, `lastSeenAt` datetime NOT NULL, `completedAt` datetime NULL, `createdAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), `updatedAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), UNIQUE INDEX `idx_course_progress_client_course_lesson_unique` (`clientId`, `courseSlug`, `lessonSlug`), INDEX `idx_course_progress_client_status` (`clientId`, `status`), PRIMARY KEY (`id`)) ENGINE=InnoDB",
    );

    await queryRunner.query(
      "CREATE TABLE `course_lexicon_events` (`id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, `clientId` varchar(191) NOT NULL, `courseSlug` varchar(128) NOT NULL, `lessonSlug` varchar(128) NOT NULL, `source` enum ('render', 'hover') NOT NULL, `eventId` varchar(128) NOT NULL, `contentVersion` varchar(64) NOT NULL, `createdAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), UNIQUE INDEX `idx_course_lexicon_events_client_event_unique` (`clientId`, `eventId`), INDEX `idx_course_lexicon_events_client_created` (`clientId`, `createdAt`), PRIMARY KEY (`id`)) ENGINE=InnoDB",
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE `course_lexicon_events`');
    await queryRunner.query('DROP TABLE `course_progress`');
  }
}
