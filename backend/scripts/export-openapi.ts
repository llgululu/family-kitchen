/**
 * 启动 Nest 应用并导出 OpenAPI JSON 到 packages/shared/openapi.json
 * 不监听端口，纯导出后退出。
 *
 * 用法：pnpm --filter @family-kitchen/backend run openapi:export
 *       （编译后会变成 node dist/scripts/export-openapi.js）
 */
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from '../src/app.module';

async function exportOpenApi(): Promise<void> {
  const app = await NestFactory.create(AppModule, { logger: false });
  app.setGlobalPrefix(process.env.API_PREFIX ?? '/api/v1');

  const config = new DocumentBuilder()
    .setTitle('情侣厨房 API')
    .setDescription('Family Kitchen REST API')
    .setVersion('0.1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  const outputPath = resolve(__dirname, '../../packages/shared/openapi.json');
  writeFileSync(outputPath, JSON.stringify(document, null, 2));
  // eslint-disable-next-line no-console
  console.log(`✅ OpenAPI exported to ${outputPath}`);
  await app.close();
}

void exportOpenApi();
