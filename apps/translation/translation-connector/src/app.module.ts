import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AiInterfaceModule } from './ai-interface/ai-interface.module';
import { Translation, WordBreakdown } from './ai-interface/translation.entity';
import { AppController } from './app.controller';
import { AppService } from './app.service';

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
        entities: [Translation, WordBreakdown],
      }),
    }),
    AiInterfaceModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
