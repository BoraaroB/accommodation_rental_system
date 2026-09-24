import { STATUS_CODES } from 'node:http';
import { HttpException, HttpStatus } from '@nestjs/common';
import { errorCodeSchema, type ApiError } from '@ars/shared';

const INTERNAL_ERROR_MESSAGE = 'Internal server error';

export interface ErrorDescription {
  statusCode: number;
  code: string;
  message: string | string[];
}

/**
 * Turns anything thrown into the status, code and message the client may see.
 * An `HttpException` keeps its status and message; its code is the
 * exception's `errorCode`, or the status name (`NOT_FOUND`). A client error
 * raised by Express middleware (e.g. the body parser's 413) keeps its status
 * and message. Anything else is a 500 whose details never leave the server.
 */
export function describeException(exception: unknown): ErrorDescription {
  if (exception instanceof HttpException) {
    const statusCode = exception.getStatus();
    const errorCode = errorCodeSchema.safeParse(exception.errorCode);
    return {
      statusCode,
      code: errorCode.success ? errorCode.data : codeForStatus(statusCode),
      message: messageOf(exception),
    };
  }

  if (isExposedClientError(exception)) {
    return {
      statusCode: exception.status,
      code: codeForStatus(exception.status),
      message: exception.message,
    };
  }

  return {
    statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
    code: 'INTERNAL_SERVER_ERROR',
    message: INTERNAL_ERROR_MESSAGE,
  };
}

/** Builds the `apiErrorSchema` body; the only place error bodies are made. */
export function buildErrorBody(
  error: ErrorDescription,
  context: { path: string; requestId: string; now?: Date },
): ApiError {
  return {
    statusCode: error.statusCode,
    error: STATUS_CODES[error.statusCode] ?? 'Error',
    code: error.code,
    message: error.message,
    path: context.path,
    timestamp: (context.now ?? new Date()).toISOString(),
    requestId: context.requestId,
  };
}

function codeForStatus(statusCode: number): string {
  const name: string | undefined = HttpStatus[statusCode];
  return name ?? 'HTTP_ERROR';
}

function messageOf(exception: HttpException): string | string[] {
  const response = exception.getResponse();
  if (typeof response === 'string') {
    return response;
  }
  if ('message' in response && isMessage(response.message)) {
    return response.message;
  }
  return exception.message;
}

/**
 * Errors from Express middleware (body parser, `http-errors`) carry a `status`
 * and mark messages that are safe to show with `expose: true`.
 */
function isExposedClientError(
  exception: unknown,
): exception is Error & { status: number; expose: true } {
  if (
    !(exception instanceof Error) ||
    !('status' in exception) ||
    !('expose' in exception)
  ) {
    return false;
  }
  const { status, expose } = exception;
  return (
    typeof status === 'number' &&
    status >= 400 &&
    status < 500 &&
    expose === true
  );
}

function isMessage(value: unknown): value is string | string[] {
  return (
    typeof value === 'string' ||
    (Array.isArray(value) && value.every((item) => typeof item === 'string'))
  );
}
