"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const core_1 = require("@nestjs/core");
const microservices_1 = require("@nestjs/microservices");
const app_module_1 = require("./app.module");
async function bootstrap() {
    const app = await core_1.NestFactory.create(app_module_1.AppModule);
    const configService = app.get(config_1.ConfigService);
    const logLevels = process.env.NODE_ENV === 'production'
        ? ['log', 'error', 'warn']
        : ['log', 'error', 'warn', 'debug', 'verbose'];
    app.useLogger(logLevels);
    const kafkaBroker = configService.get('KAFKA_BROKERS', 'kafka:9092');
    const kafkaGroupId = configService.get('KAFKA_GROUP_ID', 'flashcards-consumer');
    const port = configService.get('PORT', 3012);
    const host = configService.get('HOST', '0.0.0.0');
    app.connectMicroservice({
        transport: microservices_1.Transport.KAFKA,
        options: {
            client: {
                brokers: [kafkaBroker],
            },
            consumer: {
                groupId: kafkaGroupId,
            },
        },
    });
    app.enableCors({
        origin: configService.get('CORS_ORIGIN', '*'),
        methods: configService.get('CORS_METHODS', 'GET,POST,PUT,DELETE'),
        allowedHeaders: configService.get('CORS_HEADERS', 'Content-Type,Authorization'),
        credentials: configService.get('CORS_CREDENTIALS', true),
    });
    await app.startAllMicroservices();
    await app.listen(port, host);
    common_1.Logger.log('Flashcards service started', 'Bootstrap');
}
bootstrap();
//# sourceMappingURL=main.js.map