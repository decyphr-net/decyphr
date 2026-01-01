import {
  Body,
  Controller,
  Get,
  HttpStatus,
  Logger,
  Post,
  Query,
  Req,
  Res,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { SettingsService } from 'src/settings/settings.service';
import { AUTH_COOKIE } from './auth.constants';
import { AuthService } from './auth.service';
import { getAuthClientId } from './auth.utils';
import { AuthenticatedRequest } from './types/request';

@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(
    private readonly authService: AuthService,
    private readonly settingsService: SettingsService,
  ) { }

  /**
   * Serves the full login page (non-HTMX entry point).
   */
  @Get('login')
  async getLogin(@Res() res: Response) {
    this.logger.debug('Serving login page');
    const html = await this.authService.loadLoginPage();
    return res.send(html);
  }

  /**
   * Serves the first-time login (language selection) page.
   */
  @Get('first-login')
  async getFirstLogin(@Res() res: Response) {
    this.logger.debug('Serving first-login page');
    const html = await this.authService.loadPartial('auth/first-login.html');
    return res.send(html);
  }

  /**
   * Handles first-time login form submission.
   * Persists user language preferences.
   */
  @Post('first-login')
  async submitFirstLogin(
    @Body() body: {
      firstLanguage: string;
      targetLanguage: string;
      immersionLevel: 'normal' | 'full';
    },
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const clientId = getAuthClientId(req);
    if (!clientId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const user = await this.authService.findUserByClientId(clientId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    await this.settingsService.createUserLanguageSetting(
      user,
      body.firstLanguage,
      body.targetLanguage,
      body.immersionLevel,
    );

    return res.status(200).json({ redirect: '/dashboard' });
  }

  /**
   * Sends a magic login link to the given email address.
   */
  @Post('magic-link')
  async sendMagicLink(
    @Body() body: { email: string },
    @Res() res: Response,
  ) {
    this.logger.log(`Magic link requested for ${body.email}`);

    try {
      const result = await this.authService.handleMagicLink(body.email);
      return res.status(HttpStatus.OK).json(result);
    } catch (err) {
      this.logger.error(
        `Magic link failed for ${body.email}`,
        err.stack,
      );
      return res
        .status(HttpStatus.BAD_REQUEST)
        .json({ error: err.message });
    }
  }

  /**
   * Verifies a magic login link and establishes a session.
   */
  @Get('verify-request')
  async verifyMagicLink(
    @Query('token') token: string,
    @Query('email') email: string,
    @Req() req: AuthenticatedRequest,
    @Res() res: Response,
  ) {
    this.logger.log(`Verifying magic link for ${email}`);

    try {
      const user = await this.authService.verifyMagicLink(
        token,
        email,
        res,
      );

      req.session.user = {
        id: user.id,
        clientId: user.clientId,
        email: user.email,
      };

      this.logger.log(`Session established for user=${user.id}`);

      const settings =
        await this.settingsService.getUserLanguageSettings(user.id);

      if (!settings || settings.length === 0) {
        this.logger.debug('No language settings found → first-login');
        return res.redirect('/auth/first-login');
      }

      return res.redirect('/dashboard');
    } catch (err) {
      this.logger.error(
        `Magic link verification failed for ${email}`,
        err.stack,
      );
      return res
        .status(HttpStatus.INTERNAL_SERVER_ERROR)
        .json({ error: 'Server error' });
    }
  }

  /**
   * Returns current authenticated user (used by Alpine).
   */
  @Get('me')
  async getMe(@Req() req: Request) {
    const clientId = getAuthClientId(req);
    if (!clientId) {
      return { loggedIn: false, user: null };
    }

    const user = await this.authService.findUserByClientId(clientId);
    if (!user) {
      return { loggedIn: false, user: null };
    }

    return {
      loggedIn: true,
      user: {
        id: user.id,
        clientId: user.clientId,
        email: user.email,
      },
    };
  }

  /**
   * Logs the user out and clears the session.
   */
  @Post('logout')
  logout(@Res() res: Response) {
    res.clearCookie(AUTH_COOKIE, {
      path: '/',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
    });

    return res.status(200).json({ ok: true });
  }
}
