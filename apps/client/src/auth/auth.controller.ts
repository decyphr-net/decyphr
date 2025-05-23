import {
  Body,
  Controller,
  Get,
  HttpStatus,
  Post,
  Query,
  Req,
  Res,
} from '@nestjs/common';
import { Response } from 'express';
import { SettingsService } from 'src/settings/settings.service';
import { AuthService } from './auth.service';
import { AuthenticatedRequest } from './types/request';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly settingsService: SettingsService,
  ) { }

  @Get('login')
  async getLogin(@Res() res: Response) {
    const html = await this.authService.loadLayoutWithPartial(
      '/auth/login-partial',
    );
    return res.send(html);
  }

  @Get('login-partial')
  async getLoginPartial(@Res() res: Response) {
    const html = await this.authService.loadPartial('auth/login.html');
    return res.send(html);
  }

  @Get('first-login')
  async getFirstLogin(@Res() res: Response) {
    const html = await this.authService.loadLayoutWithPartial(
      '/auth/first-login-partial',
    );
    return res.send(html);
  }

  @Get('first-login-partial')
  async getFirstLoginPartial(@Res() res: Response) {
    const html = await this.authService.loadPartial('auth/first-login.html');
    return res.send(html);
  }

  @Post('first-login')
  async submitFirstLogin(
    @Body()
    body: {
      firstLanguage: string;
      targetLanguage: string;
      immersionLevel: 'normal' | 'full';
    },
    @Req() req: Request,
    @Res() res: Response,
  ) {
    try {
      const session = (req as any).cookies['session'];
      if (!session) {
        return res
          .status(HttpStatus.UNAUTHORIZED)
          .json({ error: 'Not authenticated' });
      }

      const user = await this.authService.findUserByClientId(session);
      if (!user) {
        return res
          .status(HttpStatus.NOT_FOUND)
          .json({ error: 'User not found' });
      }

      await this.settingsService.createUserLanguageSetting(
        user,
        body.firstLanguage,
        body.targetLanguage,
        body.immersionLevel,
      );

      return res.redirect('/dashboard');
    } catch (err) {
      return res
        .status(HttpStatus.INTERNAL_SERVER_ERROR)
        .json({ error: 'Server error' });
    }
  }

  @Post('magic-link')
  async sendMagicLink(@Body() body: { email: string }, @Res() res: Response) {
    try {
      const result = await this.authService.handleMagicLink(body.email);
      return res.status(200).json(result);
    } catch (err) {
      return res.status(400).json({ error: err.message });
    }
  }

  @Get('verify-request')
  async verifyMagicLink(
    @Query('token') token: string,
    @Query('email') email: string,
    @Req() req: AuthenticatedRequest,
    @Res() res: Response,
  ) {
    try {
      const user = await this.authService.verifyMagicLink(token, email, res);

      req.session.user = {
        id: user.id,
        clientId: user.clientId,
      };

      const settings = await this.settingsService.getUserLanguageSettings(
        user.id,
      );
      if (!settings || settings.length === 0) {
        return res.redirect('/auth/first-login');
      }

      return res.redirect('/dashboard');
    } catch (err) {
      return res
        .status(HttpStatus.INTERNAL_SERVER_ERROR)
        .json({ error: 'Server error' });
    }
  }

  @Get('/me')
  getMe(@Req() req: AuthenticatedRequest) {
    return req.session;
  }
}
