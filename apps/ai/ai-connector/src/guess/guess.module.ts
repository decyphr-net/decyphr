import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ClientsModule, Transport } from '@nestjs/microservices';

import { GroqProvider } from 'src/providers/groq.provider';
import { RedisService } from 'src/utils/redis/redis.service';
import { GuessController } from './guess.controller';
import { GuessService } from './guess.service';


@Module({
    imports: [
        ConfigModule,
        ClientsModule.registerAsync([
            {
                name: 'TRANSLATION',
                imports: [ConfigModule],
                inject: [ConfigService],
                useFactory: async (configService: ConfigService) => ({
                    transport: Transport.KAFKA,
                    options: {
                        client: {
                            clientId: configService.get<string>('KAFKA_CLIENT_ID'),
                            brokers: [configService.get<string>('KAFKA_BROKER')],
                        },
                        producerOnlyMode: true,
                        consumer: {
                            groupId: configService.get<string>('KAFKA_GROUP_ID'),
                        },
                    },
                }),
            },
        ]),
    ],
    controllers: [GuessController],
    providers: [GuessService, GroqProvider, RedisService],
})
export class GuessModule { }
