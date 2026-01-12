import { MigrationInterface, QueryRunner } from "typeorm";

export class FixesForWordForm1768032365054 implements MigrationInterface {
    name = 'FixesForWordForm1768032365054'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`word_forms\` DROP FOREIGN KEY \`FK_128d2f3b2e18959afe369db5ec6\``);
        await queryRunner.query(`DROP INDEX \`IDX_40676913bc7fcf37c3a3cfac92\` ON \`word_forms\``);
        await queryRunner.query(`ALTER TABLE \`word_forms\` CHANGE \`wordId\` \`wordId\` int NOT NULL`);
        await queryRunner.query(`CREATE UNIQUE INDEX \`IDX_40676913bc7fcf37c3a3cfac92\` ON \`word_forms\` (\`wordId\`, \`form\`)`);
        await queryRunner.query(`ALTER TABLE \`word_forms\` ADD CONSTRAINT \`FK_128d2f3b2e18959afe369db5ec6\` FOREIGN KEY (\`wordId\`) REFERENCES \`words\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`word_forms\` DROP FOREIGN KEY \`FK_128d2f3b2e18959afe369db5ec6\``);
        await queryRunner.query(`DROP INDEX \`IDX_40676913bc7fcf37c3a3cfac92\` ON \`word_forms\``);
        await queryRunner.query(`ALTER TABLE \`word_forms\` CHANGE \`wordId\` \`wordId\` int NULL`);
        await queryRunner.query(`CREATE UNIQUE INDEX \`IDX_40676913bc7fcf37c3a3cfac92\` ON \`word_forms\` (\`wordId\`, \`form\`)`);
        await queryRunner.query(`ALTER TABLE \`word_forms\` ADD CONSTRAINT \`FK_128d2f3b2e18959afe369db5ec6\` FOREIGN KEY (\`wordId\`) REFERENCES \`words\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

}
