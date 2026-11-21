import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';

type ApiErrorResponse = {
  statusCode: number;
  message: string;
  error: string;
  timestamp: string;
  path: string;
  requestId?: string;
  details?: unknown;
};

function extrairMensagemHttp(exception: HttpException) {
  const response = exception.getResponse();

  if (typeof response === 'string') {
    return response;
  }

  if (response && typeof response === 'object') {
    const maybeResponse = response as {
      message?: string | string[];
      error?: string;
    };

    if (Array.isArray(maybeResponse.message)) {
      return maybeResponse.message.join(' ');
    }

    if (typeof maybeResponse.message === 'string') {
      return maybeResponse.message;
    }

    if (typeof maybeResponse.error === 'string') {
      return maybeResponse.error;
    }
  }

  return exception.message;
}

function mensagemPrisma(error: Prisma.PrismaClientKnownRequestError) {
  const mensagens: Record<string, string> = {
    P2002: 'Já existe um registro com os dados informados.',
    P2003: 'Não foi possível concluir porque há um vínculo inválido ou inexistente.',
    P2025: 'O registro solicitado não foi encontrado.',
    P2022: 'A estrutura do banco de dados precisa ser atualizada para esta operação.',
  };

  return mensagens[error.code] ?? 'Não foi possível concluir a operação no banco de dados.';
}

function statusPrisma(error: Prisma.PrismaClientKnownRequestError) {
  if (error.code === 'P2002') {
    return HttpStatus.CONFLICT;
  }

  if (error.code === 'P2025') {
    return HttpStatus.NOT_FOUND;
  }

  if (error.code === 'P2003') {
    return HttpStatus.BAD_REQUEST;
  }

  return HttpStatus.INTERNAL_SERVER_ERROR;
}

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(ApiExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const context = host.switchToHttp();
    const response = context.getResponse<{
      status: (statusCode: number) => {
        json: (body: ApiErrorResponse) => void;
      };
    }>();
    const request = context.getRequest<{
      url?: string;
      method?: string;
      headers?: Record<string, string | string[] | undefined>;
    }>();

    const timestamp = new Date().toISOString();
    const path = request.url ?? '';
    const requestIdHeader = request.headers?.['x-request-id'];
    const requestId = Array.isArray(requestIdHeader)
      ? requestIdHeader[0]
      : requestIdHeader;

    let statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Não foi possível concluir a solicitação agora.';
    let error = 'Internal Server Error';
    let details: unknown;

    if (exception instanceof HttpException) {
      statusCode = exception.getStatus();
      message = extrairMensagemHttp(exception);
      error = exception.name;
    } else if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      statusCode = statusPrisma(exception);
      message = mensagemPrisma(exception);
      error = 'Database Error';
      details = {
        code: exception.code,
        target: exception.meta?.target,
      };
    } else if (exception instanceof Prisma.PrismaClientValidationError) {
      statusCode = HttpStatus.BAD_REQUEST;
      message = 'Os dados enviados não são válidos para esta operação.';
      error = 'Validation Error';
    } else if (exception instanceof Prisma.PrismaClientInitializationError) {
      statusCode = HttpStatus.SERVICE_UNAVAILABLE;
      message = 'Não foi possível conectar ao banco de dados.';
      error = 'Database Unavailable';
    } else if (exception instanceof Error) {
      message =
        process.env.NODE_ENV === 'production'
          ? 'Não foi possível concluir a solicitação agora.'
          : exception.message;
      error = exception.name || error;
    }

    if (statusCode >= 500) {
      this.logger.error(
        `${request.method ?? 'REQUEST'} ${path} - ${statusCode} - ${message}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    } else {
      this.logger.warn(
        `${request.method ?? 'REQUEST'} ${path} - ${statusCode} - ${message}`,
      );
    }

    response.status(statusCode).json({
      statusCode,
      message,
      error,
      timestamp,
      path,
      ...(requestId ? { requestId } : {}),
      ...(details ? { details } : {}),
    });
  }
}
