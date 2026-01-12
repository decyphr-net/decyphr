import { MigrationInterface, QueryRunner } from "typeorm";

export class AddStatementMetadata1767967865677 implements MigrationInterface {
    name = 'AddStatementMetadata1767967865677'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`statements\` ADD \`pronunciation\` varchar(500) NULL`);
        await queryRunner.query(`ALTER TABLE \`statements\` ADD \`translation\` varchar(2000) NULL`);
        await queryRunner.query(`ALTER TABLE \`statements\` ADD \`translationLanguage\` varchar(10) NULL`);
        await queryRunner.query(`ALTER TABLE \`statements\` ADD \`example\` varchar(2000) NULL`);
        await queryRunner.query(`ALTER TABLE \`statements\` ADD \`notes\` varchar(4000) NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`statements\` DROP COLUMN \`notes\``);
        await queryRunner.query(`ALTER TABLE \`statements\` DROP COLUMN \`example\``);
        await queryRunner.query(`ALTER TABLE \`statements\` DROP COLUMN \`translationLanguage\``);
        await queryRunner.query(`ALTER TABLE \`statements\` DROP COLUMN \`translation\``);
        await queryRunner.query(`ALTER TABLE \`statements\` DROP COLUMN \`pronunciation\``);
    }

}
