import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../auth/entities/User';
import { LanguageSetting } from './entities/LanguageSetting';

@Injectable()
export class SettingsService {
  constructor(
    @InjectRepository(LanguageSetting)
    private readonly settingRepo: Repository<LanguageSetting>,
  ) { }

  async getUserLanguageSettings(userId: number): Promise<LanguageSetting[]> {
    return this.settingRepo.find({ where: { user: { id: userId } } });
  }

  async createUserLanguageSetting(
    user: User,
    firstLanguage: string,
    targetLanguage: string,
    immersionLevel: 'normal' | 'full',
  ): Promise<LanguageSetting> {
    const setting = this.settingRepo.create({
      user,
      firstLanguage,
      targetLanguage,
      immersionLevel,
    });
    return this.settingRepo.save(setting);
  }

  async getTargetLanguageForUser(userId: number): Promise<string | null> {
    const setting = await this.settingRepo.findOne({
      where: {
        user: {
          id: userId,
        },
      },
      relations: ['user'], // needed if lazy loading or nested filtering
    });

    return setting?.targetLanguage ?? null;
  }
}
