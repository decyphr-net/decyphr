/*
https://docs.nestjs.com/providers#services
*/
import { Inject, Injectable, Logger } from '@nestjs/common';
import { ClientKafka } from '@nestjs/microservices';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { VaultAttempt } from './vault-attempt.entity';
import { VaultEntry } from './vault.entity';

@Injectable()
export class VaultsService {
  private readonly logger = new Logger(VaultsService.name);

  constructor(
    @InjectRepository(VaultEntry)
    private readonly vaultRepository: Repository<VaultEntry>,
    @InjectRepository(VaultAttempt)
    private readonly attemptRepository: Repository<VaultAttempt>,
    @Inject('TRANSLATION') private readonly client: ClientKafka,
  ) { }

  async addAttempt(vaultId: string, clientId: string, guess: string, lang: string): Promise<VaultAttempt> {
    const vault = await this.vaultRepository.findOne({ where: { id: vaultId } });
    if (!vault) throw new Error('Vault not found');

    const attempt = this.attemptRepository.create({ vault, clientId, guess, lang });
    return this.attemptRepository.save(attempt);
  }

  async createVaultEntry(clientId: string, text: string, lang: string): Promise<VaultEntry> {
    const entry = this.vaultRepository.create({ clientId, text, lang });
    const saved = await this.vaultRepository.save(entry);
    this.logger.log(`Vault entry created: id=${saved.id}, clientId=${clientId}`);
    return saved;
  }

  async getVaultEntries(clientId: string): Promise<VaultEntry[]> {
    return this.vaultRepository.find({
      where: { clientId },
      relations: ['attempts'],
      order: {
        createdAt: 'ASC',
        attempts: {
          createdAt: 'DESC',
        },
      },
    });
  }

  async attachEvaluation(attemptId: string, evaluation: any) {
    const attempt = await this.attemptRepository.findOne({
      where: { id: attemptId },
      relations: ['vault'],
    });
    if (!attempt) return;

    attempt.evaluation = evaluation;
    attempt.evaluatedAt = new Date();

    const saved = await this.attemptRepository.save(attempt);

    this.logger.log(`Evaluation saved for attempt ${attemptId}`);

    // Emit to Kafka topic after persisting
    await this.client.emit('vault.attempt.updated', {
      attemptId: saved.id,
      vaultId: saved.vault.id,
      clientId: saved.clientId,
      evaluation: saved.evaluation,
      evaluatedAt: saved.evaluatedAt,
    });
  }
}
