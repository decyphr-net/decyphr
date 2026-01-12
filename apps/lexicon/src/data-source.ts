import { config } from 'dotenv';
import { DataSource } from 'typeorm';
import { User, Word, WordForm } from './bank/bank.entity';
import {
  Interaction,
  UserWordStatistics,
} from './interaction/interaction.entity';
import { Statement, StatementToken } from './statement/statement.entity';
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
  entities: [
    Interaction,
    Statement,
    Word,
    User,
    UserWordStatistics,
    WordForm,
    StatementToken,
  ],
  migrations: [__dirname + '/migrations/*{.js,.ts}'],
});
