import { plainToInstance } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Min, validateSync } from 'class-validator';

enum Environment {
  Development = 'development',
  Production = 'production',
  Test = 'test',
}

class EnvironmentVariables {
  @IsEnum(Environment)
  NODE_ENV: Environment = Environment.Development;

  @IsInt()
  @Min(1)
  PORT: number = 3000;

  @IsString()
  API_PREFIX: string = '/api/v1';

  @IsString()
  DATABASE_URL!: string;

  @IsString()
  JWT_SECRET!: string;

  @IsString()
  JWT_EXPIRES_IN: string = '30d';

  @IsString()
  WX_APPID!: string;

  @IsString()
  WX_APP_SECRET!: string;

  @IsOptional()
  @IsString()
  SENTRY_DSN?: string;

  @IsString()
  STORAGE_DRIVER: string = 'minio';

  @IsString()
  LOG_LEVEL: string = 'info';

  @IsOptional()
  @IsString()
  LOG_FILE?: string;

  @IsOptional()
  @IsString()
  CORS_ORIGINS?: string;

  @IsString()
  ADMIN_USERNAME: string = 'admin';

  @IsString()
  ADMIN_PASSWORD: string = 'admin123456';

  @IsOptional()
  @IsString()
  DEEPSEEK_API_KEY?: string;

  @IsOptional()
  @IsString()
  OPENAI_API_KEY?: string;

  @IsOptional()
  @IsString()
  CLAUDE_API_KEY?: string;
}

export function envValidationSchema(config: Record<string, unknown>): EnvironmentVariables {
  const validated = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });
  const errors = validateSync(validated, { skipMissingProperties: false });
  if (errors.length > 0) {
    throw new Error(`Invalid env: ${errors.map((e) => e.toString()).join('\n')}`);
  }
  return validated;
}
