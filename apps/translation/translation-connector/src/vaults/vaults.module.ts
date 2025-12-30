import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { TypeOrmModule } from '@nestjs/typeorm';

import { VaultAttempt } from './vault-attempt.entity';
import { VaultEntry } from './vault.entity';
import { VaultsController } from './vaults.controller';
import { VaultsService } from './vaults.service';

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
                            clientId: configService.get<string>(
                                'KAFKA_CLIENT_ID',
                                'translation-connector',
                            ),
                            brokers: [
                                configService.get<string>('KAFKA_BROKER', 'localhost:29092'),
                            ],
                        },
                        producerOnlyMode: false,
                        consumer: {
                            groupId: configService.get<string>(
                                'KAFKA_GROUP_ID',
                                'translation-consumer',
                            ),
                        },
                    },
                }),
            },
        ]),
        TypeOrmModule.forFeature([VaultEntry, VaultAttempt])
    ],
    controllers: [VaultsController],
    providers: [VaultsService],
})
export class VaultsModule { }
