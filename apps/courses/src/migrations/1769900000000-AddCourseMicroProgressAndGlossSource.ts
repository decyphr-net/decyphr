import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCourseMicroProgressAndGlossSource1769900000000 implements MigrationInterface {
  name = 'AddCourseMicroProgressAndGlossSource1769900000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE `course_progress` ADD `microCompletedChunkIds` text NULL',
    );
    await queryRunner.query(
      'ALTER TABLE `course_progress` ADD `microLastChunkId` varchar(64) NULL',
    );
    await queryRunner.query(
      'ALTER TABLE `course_progress` ADD `microUpdatedAt` datetime NULL',
    );

    await queryRunner.query(
      "ALTER TABLE `course_lexicon_events` CHANGE `source` `source` enum ('render', 'hover', 'gloss') NOT NULL",
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      "ALTER TABLE `course_lexicon_events` CHANGE `source` `source` enum ('render', 'hover') NOT NULL",
    );
    await queryRunner.query(
      'ALTER TABLE `course_progress` DROP COLUMN `microUpdatedAt`',
    );
    await queryRunner.query(
      'ALTER TABLE `course_progress` DROP COLUMN `microLastChunkId`',
    );
    await queryRunner.query(
      'ALTER TABLE `course_progress` DROP COLUMN `microCompletedChunkIds`',
    );
  }
}
