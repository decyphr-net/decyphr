import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ServeStaticModule } from '@nestjs/serve-static';
import { TypeOrmModule } from '@nestjs/typeorm';
import { join } from 'path';
import { AppController } from './app.controller';
import { AuthModule } from './auth/auth.module';
import { MagicLink } from './auth/entities/MagicLink';
import { User } from './auth/entities/User';
import { BotsModule } from './bots/bots.module';
import { ChatModule } from './chat/chat.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { I18nController } from './i18n/i18n.controller';
import { I18nModule } from './i18n/i18n.module';
import { LexiconModule } from './lexicon/lexicon.module';
import { PomodoroModule } from './pomodoro/pomodoro.module';
import { LanguageSetting } from './settings/entities/LanguageSetting';
import { SettingsModule } from './settings/settings.module';
import { TranslationsModule } from './translations/translations.module';
import { UtilsModule } from './utils/utils.module';
import { VaultModule } from './vault/vault.module';
import { FlashcardsModule } from './flashcards/flashcards.module';
import { PhrasebookModule } from './phrasebook/phrasebook.module';
import { FocusModule } from './focus/focus.module';
import { PracticeModule } from './practice/practice.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'public'),
    }),
    TypeOrmModule.forRoot({
      type: 'mariadb',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '3306'),
      username: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      entities: [User, MagicLink, LanguageSetting],
      synchronize: true,
    }),
    BotsModule,
    I18nModule,
    ChatModule,
    AuthModule,
    SettingsModule,
    DashboardModule,
    UtilsModule,
    TranslationsModule,
    LexiconModule,
    VaultModule,
    PomodoroModule,
    FlashcardsModule,
    PhrasebookModule,
    FocusModule,
    PracticeModule,
  ],
  controllers: [AppController, I18nController],
})
export class AppModule { }
