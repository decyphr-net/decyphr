import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AiInterfaceModule } from './ai-interface/ai-interface.module';
import { Translation } from './ai-interface/translation.entity';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { VaultAttempt } from './vaults/vault-attempt.entity';
import { VaultEntry } from './vaults/vault.entity';
import { VaultsModule } from './vaults/vaults.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'mariadb',
        host: configService.get('MARIA_DB_HOST'),
        port: Number(configService.get('MARIA_DB_PORT')),
        username: configService.get('MARIA_DB_USERNAME'),
        password: configService.get('MARIA_DB_PASSWORD'),
        database: configService.get('MARIA_DB_DATABASE'),
        synchronize: true,
        entities: [Translation, VaultEntry, VaultAttempt],
      }),
    }),
    AiInterfaceModule,
    VaultsModule
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
