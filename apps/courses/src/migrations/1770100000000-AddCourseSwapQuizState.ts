import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCourseSwapQuizState1770100000000 implements MigrationInterface {
  name = 'AddCourseSwapQuizState1770100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE `course_progress` ADD `swapQuizState` longtext NULL',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE `course_progress` DROP COLUMN `swapQuizState`',
    );
  }
}
