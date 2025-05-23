import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import * as cookieParser from 'cookie-parser';
import * as session from 'express-session';
import { join } from 'path';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  app.enableCors({
    origin: 'http://0.0.0.0:8000',
    credentials: true,
  });

  app.use(
    session({
      secret: 'someSecret',
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: false, // true in prod with HTTPS
        httpOnly: true,
      },
    }),
  );

  // Serve static assets from /public
  app.useStaticAssets(join(__dirname, '..', 'public'));

  // Tell Express to treat .html as raw files (disable view engine)
  app.setBaseViewsDir(join(__dirname, '..', 'public/pages'));
  app.engine('html', (_, options, callback) => {
    const rendered = '';
    return callback(null, rendered);
  });
  app.setViewEngine('html');
  app.use(cookieParser());

  await app.listen(8000);
}
bootstrap();
