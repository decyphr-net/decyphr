import { config } from 'dotenv';
import { DataSource } from 'typeorm';

import { Phrase, PhraseToken } from './phrasebook/phrasebook.entity';
config();

export const AppDataSource = new DataSource({
  type: 'mariadb',
  host: process.env.MARIA_DB_HOST,
  port: Number(process.env.MARIA_DB_PORT),
  username: process.env.MARIA_DB_USERNAME,
  password: process.env.MARIA_DB_PASSWORD,
  database: process.env.MARIA_DB_DATABASE,
  synchronize: false,
  logging: false,
  entities: [Phrase, PhraseToken],
  migrations: [__dirname + '/migrations/*{.js,.ts}'],
});
