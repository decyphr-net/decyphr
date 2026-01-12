import { MigrationInterface, QueryRunner } from "typeorm";

export class UpdateLengthOfSource1767981145825 implements MigrationInterface {
    name = 'UpdateLengthOfSource1767981145825'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`statements\` DROP COLUMN \`source\``);
        await queryRunner.query(`ALTER TABLE \`statements\` ADD \`source\` varchar(30) NOT NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`statements\` DROP COLUMN \`source\``);
        await queryRunner.query(`ALTER TABLE \`statements\` ADD \`source\` varchar(15) NOT NULL`);
    }

}
