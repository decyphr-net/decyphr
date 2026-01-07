import { MigrationInterface, QueryRunner } from "typeorm";

export class InitialCreate1767768152101 implements MigrationInterface {
    name = 'InitialCreate1767768152101'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE \`interactions\` (\`id\` int NOT NULL AUTO_INCREMENT, \`timestamp\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP(), \`type\` varchar(255) NOT NULL DEFAULT 'passive', \`correctness\` float NULL, \`weight\` float NOT NULL DEFAULT '0', \`userId\` int NULL, \`wordId\` int NOT NULL, \`wordFormId\` int NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`user_word_statistics\` (\`id\` int NOT NULL AUTO_INCREMENT, \`weighted7Days\` float NOT NULL DEFAULT '0', \`weighted30Days\` float NOT NULL DEFAULT '0', \`totalInteractions7Days\` int NOT NULL DEFAULT '0', \`totalInteractions30Days\` int NOT NULL DEFAULT '0', \`lastUpdated\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP(), \`score\` decimal(5,2) NOT NULL DEFAULT '0.00', \`userId\` int NULL, \`wordId\` int NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`words\` (\`id\` int NOT NULL AUTO_INCREMENT, \`token\` varchar(100) NOT NULL, \`pos\` varchar(255) NOT NULL, \`language\` varchar(255) NOT NULL, \`lemma\` varchar(50) NOT NULL, \`cefr\` varchar(2) NULL, UNIQUE INDEX \`IDX_a40ee0c005b37ede40cc82fd40\` (\`lemma\`, \`language\`), UNIQUE INDEX \`IDX_136250ee51e77b5b0971babdcd\` (\`lemma\`, \`pos\`, \`language\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`word_forms\` (\`id\` int NOT NULL AUTO_INCREMENT, \`form\` varchar(100) NOT NULL, \`wordId\` int NULL, UNIQUE INDEX \`IDX_40676913bc7fcf37c3a3cfac92\` (\`wordId\`, \`form\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`users\` (\`id\` int NOT NULL AUTO_INCREMENT, \`clientId\` varchar(255) NOT NULL, UNIQUE INDEX \`IDX_6c3a73bbc9d8a8082816adc870\` (\`clientId\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`statements\` (\`id\` int NOT NULL AUTO_INCREMENT, \`statement\` varchar(2000) NOT NULL, \`language\` varchar(255) NOT NULL, \`timestamp\` timestamp NOT NULL, \`source\` varchar(15) NOT NULL, \`clientId\` varchar(255) NOT NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`ALTER TABLE \`interactions\` ADD CONSTRAINT \`FK_9992157cbe54583ff7002ae4c00\` FOREIGN KEY (\`userId\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`interactions\` ADD CONSTRAINT \`FK_3e6839329886594f545539c364d\` FOREIGN KEY (\`wordId\`) REFERENCES \`words\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`interactions\` ADD CONSTRAINT \`FK_ff156e9e1e63cce11da3f7d157c\` FOREIGN KEY (\`wordFormId\`) REFERENCES \`word_forms\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`user_word_statistics\` ADD CONSTRAINT \`FK_487d605515684e1b8e8bc86c417\` FOREIGN KEY (\`userId\`) REFERENCES \`users\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`user_word_statistics\` ADD CONSTRAINT \`FK_ff5df1986537f88377c7ed8b303\` FOREIGN KEY (\`wordId\`) REFERENCES \`words\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`word_forms\` ADD CONSTRAINT \`FK_128d2f3b2e18959afe369db5ec6\` FOREIGN KEY (\`wordId\`) REFERENCES \`words\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`word_forms\` DROP FOREIGN KEY \`FK_128d2f3b2e18959afe369db5ec6\``);
        await queryRunner.query(`ALTER TABLE \`user_word_statistics\` DROP FOREIGN KEY \`FK_ff5df1986537f88377c7ed8b303\``);
        await queryRunner.query(`ALTER TABLE \`user_word_statistics\` DROP FOREIGN KEY \`FK_487d605515684e1b8e8bc86c417\``);
        await queryRunner.query(`ALTER TABLE \`interactions\` DROP FOREIGN KEY \`FK_ff156e9e1e63cce11da3f7d157c\``);
        await queryRunner.query(`ALTER TABLE \`interactions\` DROP FOREIGN KEY \`FK_3e6839329886594f545539c364d\``);
        await queryRunner.query(`ALTER TABLE \`interactions\` DROP FOREIGN KEY \`FK_9992157cbe54583ff7002ae4c00\``);
        await queryRunner.query(`DROP TABLE \`statements\``);
        await queryRunner.query(`DROP INDEX \`IDX_6c3a73bbc9d8a8082816adc870\` ON \`users\``);
        await queryRunner.query(`DROP TABLE \`users\``);
        await queryRunner.query(`DROP INDEX \`IDX_40676913bc7fcf37c3a3cfac92\` ON \`word_forms\``);
        await queryRunner.query(`DROP TABLE \`word_forms\``);
        await queryRunner.query(`DROP INDEX \`IDX_136250ee51e77b5b0971babdcd\` ON \`words\``);
        await queryRunner.query(`DROP INDEX \`IDX_a40ee0c005b37ede40cc82fd40\` ON \`words\``);
        await queryRunner.query(`DROP TABLE \`words\``);
        await queryRunner.query(`DROP TABLE \`user_word_statistics\``);
        await queryRunner.query(`DROP TABLE \`interactions\``);
    }

}
