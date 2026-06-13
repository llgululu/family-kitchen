import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Logger } from 'nestjs-pino';
import * as Sentry from '@sentry/node';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import multipart from '@fastify/multipart';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/all-exceptions.filter';
import { MAX_UPLOAD_SIZE_BYTES } from './modules/storage/storage.service';

async function bootstrap() {
  const fastify = new FastifyAdapter();

  const app = await NestFactory.create<NestFastifyApplication>(AppModule, fastify, {
    bufferLogs: true,
  });

  // 替换默认 JSON 解析器，允许 content-type: application/json 的空 body
  // （微信小程序 POST/DELETE 不带 data 时仍会发该 header）
  const instance = fastify.getInstance();
  instance.removeAllContentTypeParsers();
  instance.addContentTypeParser('application/json', { parseAs: 'string' }, (_req, body, done) => {
    try {
      done(null, body === '' ? {} : JSON.parse(body as string));
    } catch (err) {
      done(err as Error);
    }
  });
  instance.addContentTypeParser('text/plain', { parseAs: 'string' }, (_req, body, done) => {
    done(null, body);
  });
  instance.addContentTypeParser(
    'application/x-www-form-urlencoded',
    { parseAs: 'string' },
    (_req, body, done) => {
      done(null, body);
    },
  );
  // 标记已注册，阻止 NestJS init() 时重复注册
  (fastify as any)._isParserRegistered = true;

  app.useLogger(app.get(Logger));

  // multipart 支持文件上传
  await app.register(multipart, {
    limits: {
      fileSize: MAX_UPLOAD_SIZE_BYTES,
      files: 1,
    },
  });

  const config = app.get(ConfigService);
  const port = config.get<number>('PORT', 3000);
  const apiPrefix = config.get<string>('API_PREFIX', '/api/v1');
  const corsOrigins = (config.get<string>('CORS_ORIGINS') ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  // Sentry
  const sentryDsn = config.get<string>('SENTRY_DSN');
  if (sentryDsn) {
    Sentry.init({
      dsn: sentryDsn,
      environment: config.get<string>('SENTRY_ENVIRONMENT', 'development'),
      tracesSampleRate: 0.1,
    });
  }

  app.setGlobalPrefix(apiPrefix);
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );
  app.useGlobalFilters(new AllExceptionsFilter());

  app.enableCors({
    origin: corsOrigins.length > 0 ? corsOrigins : true,
    credentials: true,
  });

  // Swagger / OpenAPI
  const swaggerConfig = new DocumentBuilder()
    .setTitle('情侣厨房 API')
    .setDescription('Family Kitchen REST API')
    .setVersion('0.1.0')
    .addBearerAuth()
    .build();
  const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup(`${apiPrefix}/docs`, app, swaggerDocument);

  await app.listen(port, '0.0.0.0');
  // eslint-disable-next-line no-console
  console.log(`🚀 Family Kitchen backend listening on http://localhost:${port}${apiPrefix}`);
  // eslint-disable-next-line no-console
  console.log(`📚 Swagger UI:  http://localhost:${port}${apiPrefix}/docs`);
}

void bootstrap();
