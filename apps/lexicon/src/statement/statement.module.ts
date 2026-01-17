import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BankModule } from 'src/bank/bank.module';
import { InteractionModule } from 'src/interaction/interaction.module';
import { StatementController } from './statement.controller';
import { Statement, StatementToken } from './statement.entity';
import { StatementService } from './statement.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Statement, StatementToken]),
    ClientsModule.register([
      {
        name: 'STATEMENT_PRODUCER',
        transport: Transport.KAFKA,
        options: {
          client: {
            brokers: ['kafka:9092'],
          },
          consumer: {
            groupId: 'statement-producer-group',
          },
        },
      },
    ]),
    BankModule,
    InteractionModule,
  ],
  exports: [StatementService],
  providers: [StatementService],
  controllers: [StatementController],
})
export class StatementModule { }
