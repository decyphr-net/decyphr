import "reflect-metadata";
import { DataSource } from "typeorm";

// FORCE the entity metadata to be registered BEFORE AppDataSource is created
import { LanguageSetting } from "../models/LanguageSetting";
import { MagicLink } from "../models/MagicLink";
import { User } from "../models/User";

const entities = [User, MagicLink, LanguageSetting];

let AppDataSource: DataSource | null = null;

export const getDataSource = async () => {
  if (!AppDataSource) {
    AppDataSource = new DataSource({
      type: "mariadb",
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT),
      username: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      entities,
      synchronize: true,
    });

    // Log this to debug what metadata TypeORM sees
    await AppDataSource.initialize();
    console.log("✔ TypeORM initialized");
    console.log("🧩 Registered entities:", AppDataSource.entityMetadatas.map((e) => e.name));
  }

  return AppDataSource;
};
