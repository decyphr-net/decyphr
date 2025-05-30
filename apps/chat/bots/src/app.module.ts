import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { Bot } from './bots/bots.entity';
import { BotsModule } from './bots/bots.module';
import { UtilsModule } from './utils/utils.module';

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
        entities: [Bot],
      }),
    }),
    BotsModule,
    UtilsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
