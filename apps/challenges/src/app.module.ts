import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Challenge } from './challenges/challenge.entity';
import { ChallengesModule } from './challenges/challenges.module';

@Module({
  imports: [
    ConfigModule.forRoot(),
    TypeOrmModule.forRoot({
      type: 'mariadb',
      host: process.env.DB_HOST || process.env.MARIA_DB_HOST || 'mariadb',
      port: Number(process.env.DB_PORT || process.env.MARIA_DB_PORT || 3306),
      username: process.env.DB_USER || process.env.MARIA_DB_USERNAME || 'root',
      password: process.env.DB_PASSWORD || process.env.MARIA_DB_PASSWORD || 'password',
      database: process.env.DB_NAME || process.env.MARIA_DB_DATABASE || 'decyphr',
      entities: [Challenge],
      synchronize: true,
      logging: false,
    }),
    ChallengesModule,
  ],
})
export class AppModule {}
