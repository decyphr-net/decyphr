import { MigrationInterface, QueryRunner } from "typeorm";

export class InitialMigration1769432852791 implements MigrationInterface {
    name = 'InitialMigration1769432852791'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE \`phrases\` (\`id\` int NOT NULL AUTO_INCREMENT, \`text\` varchar(2000) NOT NULL, \`meaning\` varchar(2000) NULL, \`language\` varchar(10) NOT NULL, \`source\` varchar(30) NOT NULL, \`clientId\` varchar(255) NOT NULL, \`fingerprint\` varchar(64) NOT NULL, \`createdAt\` timestamp NOT NULL, \`pronunciation\` varchar(500) NULL, \`translation\` varchar(2000) NULL, \`translationLanguage\` varchar(10) NULL, \`example\` varchar(2000) NULL, \`notes\` varchar(4000) NULL, \`requestId\` varchar(36) NULL, UNIQUE INDEX \`IDX_aa8cc0a3bb8d686ef087a92d60\` (\`fingerprint\`), UNIQUE INDEX \`IDX_0be82390d209a771f0f6c5f8dc\` (\`requestId\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`phrase_tokens\` (\`id\` int NOT NULL AUTO_INCREMENT, \`word\` varchar(255) NOT NULL, \`position\` int NOT NULL, \`surface\` varchar(100) NOT NULL, \`lemma\` varchar(50) NOT NULL, \`pos\` varchar(100) NOT NULL, \`phraseId\` int NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`ALTER TABLE \`phrase_tokens\` ADD CONSTRAINT \`FK_0d0a2368394cf6084388d87cbc2\` FOREIGN KEY (\`phraseId\`) REFERENCES \`phrases\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`phrase_tokens\` DROP FOREIGN KEY \`FK_0d0a2368394cf6084388d87cbc2\``);
        await queryRunner.query(`DROP TABLE \`phrase_tokens\``);
        await queryRunner.query(`DROP INDEX \`IDX_0be82390d209a771f0f6c5f8dc\` ON \`phrases\``);
        await queryRunner.query(`DROP INDEX \`IDX_aa8cc0a3bb8d686ef087a92d60\` ON \`phrases\``);
        await queryRunner.query(`DROP TABLE \`phrases\``);
    }

}
