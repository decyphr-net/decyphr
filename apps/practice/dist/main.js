"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const core_1 = require("@nestjs/core");
const app_module_1 = require("./app.module");
async function bootstrap() {
    const app = await core_1.NestFactory.create(app_module_1.AppModule);
    const configService = app.get(config_1.ConfigService);
    const logLevels = process.env.NODE_ENV === 'production'
        ? ['log', 'error', 'warn']
        : ['log', 'error', 'warn', 'debug', 'verbose'];
    app.useLogger(logLevels);
    app.useGlobalPipes(new common_1.ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
    }));
    app.enableCors({
        origin: configService.get('CORS_ORIGIN', '*'),
        methods: configService.get('CORS_METHODS', 'GET,POST,PUT,DELETE'),
        allowedHeaders: configService.get('CORS_HEADERS', 'Content-Type,Authorization'),
        credentials: configService.get('CORS_CREDENTIALS', true),
    });
    const port = configService.get('PORT', 3014);
    const host = configService.get('HOST', '0.0.0.0');
    await app.listen(port, host);
    common_1.Logger.log('Practice service started', 'Bootstrap');
}
bootstrap();
//# sourceMappingURL=main.js.map