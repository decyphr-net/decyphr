import { HttpService } from '@nestjs/axios';
import { Controller, Get, Req, UnauthorizedException } from '@nestjs/common';
import { AuthService } from 'src/auth/auth.service';
import { AuthenticatedRequest } from 'src/auth/types/request';
import { SettingsService } from 'src/settings/settings.service';

interface Bot {
  id: number;
  name: string;
  gender: string;
  age: number;
  region: string;
  city: string;
  background: string;
  occupation: string;
  hobbies: string;
  personal: string;
  language: string;
}

@Controller('bots')
export class BotsController {
  constructor(
    private readonly httpService: HttpService,
    private readonly authService: AuthService,
    private readonly settingsService: SettingsService,
  ) { }

  @Get()
  async getBots(@Req() req: AuthenticatedRequest): Promise<Bot> {
    const user = await this.authService.getUserFromSession(req);
    if (!user?.id) throw new UnauthorizedException('User not authenticated');

    const targetLanguage = await this.settingsService.getTargetLanguageForUser(
      +user.id,
    );

    const response = await fetch(
      `http://bots:3000/bots?language=${targetLanguage || 'ga'}`,
    );
    return response.json();
  }
}
