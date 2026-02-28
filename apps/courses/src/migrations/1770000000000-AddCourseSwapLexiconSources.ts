import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCourseSwapLexiconSources1770000000000 implements MigrationInterface {
  name = 'AddCourseSwapLexiconSources1770000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      "ALTER TABLE `course_lexicon_events` CHANGE `source` `source` enum ('render', 'hover', 'gloss', 'swap_correct', 'swap_incorrect') NOT NULL",
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      "ALTER TABLE `course_lexicon_events` CHANGE `source` `source` enum ('render', 'hover', 'gloss') NOT NULL",
    );
  }
}
