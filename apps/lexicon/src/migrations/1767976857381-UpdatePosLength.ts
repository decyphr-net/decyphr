import { MigrationInterface, QueryRunner } from "typeorm";

export class UpdatePosLength1767976857381 implements MigrationInterface {
    name = 'UpdatePosLength1767976857381'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`statement_tokens\` DROP COLUMN \`pos\``);
        await queryRunner.query(`ALTER TABLE \`statement_tokens\` ADD \`pos\` varchar(100) NOT NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`statement_tokens\` DROP COLUMN \`pos\``);
        await queryRunner.query(`ALTER TABLE \`statement_tokens\` ADD \`pos\` varchar(20) NOT NULL`);
    }

}
