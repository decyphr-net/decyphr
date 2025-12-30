import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AuthModule } from 'src/auth/auth.module';
import { AuthService } from 'src/auth/auth.service';
import { MagicLink } from 'src/auth/entities/MagicLink';
import { User } from 'src/auth/entities/User';
import { TranslationsService } from 'src/translations/translations.service';
import { KafkaModule } from 'src/utils/kafka/kafka.module';
import { VaultController } from './vault.controller';
import { VaultService } from './vault.service';

@Module({
  controllers: [VaultController],
  providers: [VaultService, TranslationsService, AuthService],
  imports: [
    KafkaModule,
    AuthModule,
    HttpModule, TypeOrmModule.forFeature([User, MagicLink])]
})
export class VaultModule { }
