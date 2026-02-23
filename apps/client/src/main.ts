import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import * as cookieParser from 'cookie-parser';
import { NextFunction, Request, Response } from 'express';
import * as session from 'express-session';
import { join } from 'path';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  const allowedOrigins = (
    process.env.CORS_ORIGINS || 'http://0.0.0.0:8000,http://localhost:5173'
  )
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
  });

  app.use(cookieParser());

  app.use((req: Request, res: Response, next: NextFunction) => {
    if (process.env.AUTH_TRUSTED_HEADERS_ENABLED !== 'true') {
      return next();
    }

    const hasForwardedIdentity =
      typeof req.headers['x-user-id'] === 'string' ||
      typeof req.headers['x-client-id'] === 'string' ||
      typeof req.headers['x-session-id'] === 'string';

    if (!hasForwardedIdentity) {
      return next();
    }

    const trustedIps = (process.env.AUTH_TRUSTED_PROXY_IPS || '')
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean);

    const forwardedFor = (req.headers['x-forwarded-for'] as string | undefined)
      ?.split(',')[0]
      ?.trim();
    const remoteAddress = forwardedFor || req.socket.remoteAddress || '';
    const normalizedRemoteAddress = remoteAddress
      .replace(/^\[|\]$/g, '')
      .replace(/^::ffff:/, '');
    const isLocal =
      normalizedRemoteAddress === '127.0.0.1' ||
      normalizedRemoteAddress === '::1' ||
      normalizedRemoteAddress === 'localhost' ||
      normalizedRemoteAddress.startsWith('172.') ||
      normalizedRemoteAddress.startsWith('10.') ||
      normalizedRemoteAddress.startsWith('192.168.');
    const isTrusted =
      isLocal ||
      trustedIps.includes(remoteAddress) ||
      trustedIps.includes(normalizedRemoteAddress);

    if (!isTrusted) {
      return res
        .status(403)
        .json({ error: 'Forwarded identity headers are not allowed' });
    }

    const userIdHeader = req.headers['x-user-id'];
    const clientIdHeader = req.headers['x-client-id'];
    const sessionIdHeader = req.headers['x-session-id'];
    const emailHeader = req.headers['x-user-email'];

    const userId =
      typeof userIdHeader === 'string'
        ? Number.parseInt(userIdHeader, 10)
        : undefined;

    (req as Request & { authContext?: unknown }).authContext = {
      userId: Number.isFinite(userId ?? NaN) ? userId : undefined,
      clientId: typeof clientIdHeader === 'string' ? clientIdHeader : undefined,
      sessionId:
        typeof sessionIdHeader === 'string' ? sessionIdHeader : undefined,
      email: typeof emailHeader === 'string' ? emailHeader : undefined,
    };

    return next();
  });

  if (process.env.DISABLE_EXPRESS_SESSION !== 'true') {
    app.use(
      session({
        secret: process.env.SESSION_SECRET || 'someSecret',
        resave: false,
        saveUninitialized: false,
        cookie: {
          secure: process.env.NODE_ENV === 'production',
          httpOnly: true,
          sameSite: 'lax',
        },
      }),
    );
  }

  // Serve static assets from /public
  app.useStaticAssets(join(__dirname, '..', 'public'));

  // Tell Express to treat .html as raw files (disable view engine)
  app.setBaseViewsDir(join(__dirname, '..', 'public/pages'));
  app.engine('html', (_, options, callback) => {
    const rendered = '';
    return callback(null, rendered);
  });
  app.setViewEngine('html');

  await app.listen(8000);
}
bootstrap();
