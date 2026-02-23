import { config } from 'dotenv';
import { DataSource } from 'typeorm';
import { PracticeAttempt, PracticeProfile } from './practice/practice.entity';

config();

const host = process.env.DB_HOST || process.env.MARIA_DB_HOST || 'mariadb';
const port = Number(process.env.DB_PORT || process.env.MARIA_DB_PORT || 3306);
const username = process.env.DB_USER || process.env.MARIA_DB_USERNAME || 'root';
const password = process.env.DB_PASSWORD || process.env.MARIA_DB_PASSWORD || 'password';
const database = process.env.DB_NAME || process.env.MARIA_DB_DATABASE || 'decyphr';

export const AppDataSource = new DataSource({
  type: 'mariadb',
  host,
  port,
  username,
  password,
  database,
  synchronize: false,
  logging: false,
  entities: [PracticeProfile, PracticeAttempt],
  migrations: [__dirname + '/migrations/*{.js,.ts}'],
});
