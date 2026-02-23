import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FocusModule } from './focus/focus.module';
import { FocusSession } from './focus/focus-session.entity';
import { Goal } from './focus/goal.entity';
import { GoalEntry } from './focus/goal-entry.entity';

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
      entities: [FocusSession, Goal, GoalEntry],
      synchronize: true,
      logging: false,
    }),
    FocusModule,
  ],
})
export class AppModule {}
