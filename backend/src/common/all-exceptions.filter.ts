import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { FastifyReply } from 'fastify';
import * as Sentry from '@sentry/node';

interface ErrorResponse {
  code: string;
  message: string;
  details?: unknown;
}

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<FastifyReply>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let body: ErrorResponse = {
      code: 'INTERNAL_ERROR',
      message: 'Internal server error',
    };

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();
      if (typeof res === 'string') {
        body = { code: exception.name, message: res };
      } else if (typeof res === 'object' && res !== null) {
        const r = res as Record<string, unknown>;
        // ValidationPipe 返回 message 为 string[] 的情况
        let msg: string = exception.message;
        if (typeof r.message === 'string') {
          msg = r.message;
        } else if (Array.isArray(r.message)) {
          msg = r.message.join('; ');
        }
        body = {
          code: typeof r.code === 'string' ? r.code : exception.name,
          message: msg,
          details: r.details ?? r.errors ?? (Array.isArray(r.message) ? r.message : undefined),
        };
      }
    } else if (exception instanceof Error) {
      // Fastify body parsing errors (e.g. Content-Length mismatch) → 400
      const payloadErrors = [
        'FST_ERR_CTP_EMPTY_JSON_BODY',
        'FST_ERR_CTP_INVALID_CONTENT_LENGTH',
        'Request body size did not match Content-Length',
      ];
      const errCode = (exception as any).code as string | undefined;
      if (payloadErrors.some((e) => exception.message.includes(e) || errCode === e)) {
        status = HttpStatus.BAD_REQUEST;
        body = { code: 'BAD_REQUEST', message: exception.message };
      } else {
        this.logger.error(exception.message, exception.stack);
        Sentry.captureException(exception);
        body = { code: 'INTERNAL_ERROR', message: exception.message };
      }
    }

    void response.status(status).send(body);
  }
}
