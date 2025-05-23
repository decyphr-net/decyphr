import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ChatModule } from './chat/chat.module';
import { EnrichmentModule } from './enrichment/enrichment.module';
import { TranslationModule } from './translation/translation.module';
import { UtilsModule } from './utils/utils.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TranslationModule,
    ChatModule,
    UtilsModule,
    EnrichmentModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
