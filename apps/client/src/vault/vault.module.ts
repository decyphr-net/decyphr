import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';

import { AuthModule } from 'src/auth/auth.module';
import { TranslationsModule } from 'src/translations/translations.module';
import { KafkaModule } from 'src/utils/kafka/kafka.module';
import { VaultController } from './vault.controller';
import { VaultService } from './vault.service';

@Module({
  controllers: [VaultController],
  providers: [VaultService],
  imports: [
    KafkaModule,
    AuthModule,
    TranslationsModule,
    HttpModule,
  ],
})
export class VaultModule { }
