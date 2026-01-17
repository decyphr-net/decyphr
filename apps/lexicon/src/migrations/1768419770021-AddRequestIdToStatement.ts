import { MigrationInterface, QueryRunner } from "typeorm";

export class AddRequestIdToStatement1768419770021 implements MigrationInterface {
    name = 'AddRequestIdToStatement1768419770021'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`statements\` ADD \`requestId\` varchar(36) NULL`);
        await queryRunner.query(`ALTER TABLE \`statements\` ADD UNIQUE INDEX \`IDX_7e279e48fc661af9dc5dab033c\` (\`requestId\`)`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`statements\` DROP INDEX \`IDX_7e279e48fc661af9dc5dab033c\``);
        await queryRunner.query(`ALTER TABLE \`statements\` DROP COLUMN \`requestId\``);
    }

}
