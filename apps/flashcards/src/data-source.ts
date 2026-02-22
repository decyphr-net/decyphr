import { config } from 'dotenv';
import { DataSource } from 'typeorm';

import {
  Flashcard,
  FlashcardAttempt,
  FlashcardPack,
} from './flashcards/flashcards.entity';

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
  entities: [FlashcardPack, Flashcard, FlashcardAttempt],
  migrations: [__dirname + '/migrations/*{.js,.ts}'],
});
