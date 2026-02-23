import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  HttpStatus,
  Logger,
  Post,
  Query,
  Req,
  Res,
} from '@nestjs/common';
import { Response } from 'express';
import { SettingsService } from 'src/settings/settings.service';
import { AUTH_COOKIE } from './auth.constants';
import { AuthService } from './auth.service';
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
    @Req() req: AuthenticatedRequest,
    @Res() res: Response,
  ) {
    const user = await this.authService.getUserFromSession(req);
    await this.settingsService.createUserLanguageSetting(
      user,
      body.firstLanguage || 'en',
      body.targetLanguage || 'ga',
      body.immersionLevel || 'normal',
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

      if (req.session) {
        req.session.user = {
          id: user.id,
          clientId: user.clientId,
          email: user.email,
        };
      }

      this.logger.log(`Session established for user=${user.id}`);

      await this.authService.ensureDefaultLanguageSettings(user);

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
   * Internal endpoint for SvelteKit to validate magic-link tokens without
   * setting a Nest session cookie.
   */
  @Post('verify-token')
  async verifyToken(
    @Body() body: { token: string; email: string },
    @Req() req: AuthenticatedRequest,
  ) {
    const trustedInternal = process.env.AUTH_TRUSTED_HEADERS_ENABLED === 'true';
    if (trustedInternal) {
      const internalSecret = req.headers['x-internal-auth'];
      if (internalSecret !== process.env.INTERNAL_AUTH_SECRET) {
        throw new ForbiddenException('Forbidden');
      }
    }

    const user = await this.authService.verifyMagicLinkToken(
      body.token,
      body.email,
    );
    return {
      user: {
        id: user.id,
        email: user.email,
        clientId: user.clientId,
      },
    };
  }

  /**
   * Returns current authenticated user (used by Alpine).
   */
  @Get('me')
  async getMe(@Req() req: AuthenticatedRequest) {
    try {
      const user = await this.authService.getUserFromSession(req);
      return {
        loggedIn: true,
        user: {
          id: user.id,
          clientId: user.clientId,
          email: user.email,
        },
      };
    } catch {
      return { loggedIn: false, user: null };
    }
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
