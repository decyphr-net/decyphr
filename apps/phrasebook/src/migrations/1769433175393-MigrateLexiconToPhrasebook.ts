import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialPhrasebookWithLexiconData1769433175393
  implements MigrationInterface
{
  name = 'InitialPhrasebookWithLexiconData1769433175393';

  public async up(queryRunner: QueryRunner): Promise<void> {

    /**
     * 1. Migrate statements → phrases
     *
     * IMPORTANT:
     * - meaning takes precedence
     * - translation is preserved
     * - IDs are preserved
     */
    await queryRunner.query(`
        INSERT IGNORE INTO phrases (
            text,
            meaning,
            language,
            source,
            clientId,
            fingerprint,
            createdAt,
            pronunciation,
            translation,
            translationLanguage,
            example,
            notes,
            requestId
        )
        SELECT
            s.text,
            COALESCE(s.meaning, s.translation),
            s.language,
            s.source,
            s.clientId,
            s.fingerprint,
            s.createdAt,
            s.pronunciation,
            s.translation,
            s.translationLanguage,
            s.example,
            s.notes,
            s.requestId
        FROM lexicon.statements s;
    `);

    /**
     * 2. Migrate statement_tokens → phrase_tokens
     *
     * NOTE:
     * - word entity is flattened to word string
     */
    await queryRunner.query(`
        INSERT INTO phrase_tokens (
            phraseId,
            word,
            position,
            surface,
            lemma,
            pos
        )
        SELECT
            p.id,
            w.token,
            st.position,
            st.surface,
            st.lemma,
            st.pos
        FROM lexicon.statement_tokens st
        JOIN lexicon.statements s ON s.id = st.statementId
        JOIN phrases p ON p.fingerprint = s.fingerprint
        JOIN lexicon.words w ON w.id = st.wordId;
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    /**
     * Destructive rollback is acceptable for initial migration
     */
    await queryRunner.query(`DROP TABLE IF EXISTS phrase_tokens`);
    await queryRunner.query(`DROP TABLE IF EXISTS phrases`);
  }
}
