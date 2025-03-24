import "reflect-metadata";
import { DataSource } from "typeorm";
import { LanguageSetting } from "../models/LanguageSetting";
import { MagicLink } from "../models/MagicLink";
import { User } from "../models/User";

const AppDataSource = new DataSource({
  type: "mariadb",
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  username: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  entities: [User, MagicLink, LanguageSetting],
  synchronize: true,
});

let dataSourceInitialized = false;

export const getDataSource = async () => {
  if (!dataSourceInitialized) {
    await AppDataSource.initialize();
    dataSourceInitialized = true;
  }
  return AppDataSource;
};
